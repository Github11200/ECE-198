"""Export the pinned AlphaPose networks for optional Intel CPU/GPU acceleration."""
import argparse
import inspect
import json
import os
from pathlib import Path
import sys
import textwrap
import types

from alphapose_acceleration import MODEL_FILES, ROOT, sha256


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'data' / 'openvino')
    parser.add_argument('--detector-size', type=int, default=416)
    args = parser.parse_args()
    if not 128 <= args.detector_size <= 1280 or args.detector_size % 32:
        parser.error('--detector-size must be a multiple of 32 between 128 and 1280')
    repo, output = args.repo.resolve(), args.output.resolve()
    for relative_path in MODEL_FILES.values():
        if not (repo / relative_path).is_file():
            parser.error(f'Missing AlphaPose file: {relative_path}')
    output.mkdir(parents=True, exist_ok=True)
    os.chdir(repo)
    sys.path.insert(0, str(repo))

    import onnx
    import torch
    from easydict import EasyDict
    from alphapose.models import builder
    from alphapose.utils.config import update_config
    from detector.yolo_api import YOLODetector
    from detector.yolo_cfg import cfg

    torch.set_num_threads(4)
    options = EasyDict(device=torch.device('cpu'), gpus=[-1], tracking=False)
    cfg.INP_DIM = args.detector_size
    detector = YOLODetector(cfg, options)
    detector.load_model()
    forward = detector.model.forward
    source = textwrap.dedent(inspect.getsource(forward))
    old = 'x = x.data.to(args.device)'
    if old not in source:
        raise ValueError('Unexpected YOLO forward implementation; use the pinned AlphaPose checkout.')
    # Tensor.data disconnects the traced input, producing a constant graph.
    # Omitting this detach during export preserves the same no_grad math.
    namespace = dict(forward.__func__.__globals__)
    exec(compile(source.replace(old, 'x = x.to(args.device)'), '<yolo-export>', 'exec'), namespace)
    detector.model.forward = types.MethodType(namespace['forward'], detector.model)

    class Yolo(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        def forward(self, images):
            return self.model(images, args=options)

    config = update_config(str(repo / MODEL_FILES['pose_config']))
    pose = builder.build_sppe(config.MODEL, preset_cfg=config.DATA_PRESET).eval()
    pose.load_state_dict(torch.load(str(repo / MODEL_FILES['pose_weights']), map_location='cpu'))
    manifest = {'detector_size': args.detector_size}
    for name, model, shape in (
        ('yolo', Yolo(detector.model).eval(), (1, 3, args.detector_size, args.detector_size)),
        ('pose', pose, (1, 3, 256, 192)),
    ):
        destination = output / (name + '.onnx')
        print('Exporting', destination, flush=True)
        with torch.no_grad():
            torch.onnx.export(model, torch.zeros(shape), str(destination), opset_version=13,
                              input_names=['images'], output_names=['predictions'])
        exported = onnx.load(str(destination))
        onnx.checker.check_model(exported)
        if len(exported.graph.input) != 1:
            raise ValueError(f'{name} export must depend on its input image.')
        manifest[name + '_onnx'] = sha256(destination)
    manifest.update({name: sha256(repo / path) for name, path in MODEL_FILES.items()})
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('Exports ready:', output, flush=True)


if __name__ == '__main__':
    main()
