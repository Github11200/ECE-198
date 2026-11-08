"""Optional OpenVINO adapters for the pinned COCO FastPose and YOLO models."""
import hashlib
import json
from pathlib import Path
from time import sleep

ROOT = Path(__file__).resolve().parents[2]  # repository root
MODEL_FILES = {
    'pose_weights': 'pretrained_models/fast_res50_256x192.pth',
    'detector_weights': 'detector/yolo/data/yolov3-spp.weights',
    'pose_config': 'configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml',
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def prepare_openvino(repo, model_dir, device, detector_size):
    """Validate exports and compile them without changing the upstream source."""
    # Conversion telemetry is optional. Give it a private local opt-out file,
    # leaving the user's system-wide preferences and cache untouched.
    from openvino_telemetry.utils.opt_in_checker import OptInChecker
    state = ROOT / 'data' / 'openvino-state'
    consent = state / 'Intel Corporation' / 'openvino_telemetry'
    consent.parent.mkdir(parents=True, exist_ok=True)
    consent.write_text('0', encoding='utf-8')
    OptInChecker.consent_file_base_dir = staticmethod(lambda: str(state))

    import openvino as ov
    import torch
    from alphapose.models import builder
    from detector.yolo_api import YOLODetector
    from alphapose.utils import webcam_detector

    manifest_path = model_dir / 'manifest.json'
    if not manifest_path.is_file():
        raise ValueError('Export models first with python -m backend.camera.export_models; missing ' + str(manifest_path))
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest.get('detector_size') != detector_size:
        raise ValueError('The exported detector size does not match --detector-size.')
    for name, relative_path in MODEL_FILES.items():
        if manifest.get(name) != sha256(repo / relative_path):
            raise ValueError(f'OpenVINO export does not match the installed {name}. Re-export it.')
    for name in ('yolo', 'pose'):
        if manifest.get(name + '_onnx') != sha256(model_dir / (name + '.onnx')):
            raise ValueError(f'The {name} ONNX export changed. Re-export the models.')

    core = ov.Core()
    if device not in core.available_devices:
        raise ValueError(f'OpenVINO device {device} is unavailable; found {core.available_devices}.')
    cache = model_dir / 'cache'
    cache.mkdir(exist_ok=True)
    settings = {'PERFORMANCE_HINT': 'LATENCY', 'CACHE_DIR': str(cache),
                'INFERENCE_PRECISION_HINT': ov.Type.f32}
    print(f'Compiling AlphaPose networks for {core.get_property(device, "FULL_DEVICE_NAME")}...', flush=True)
    compiled_yolo = core.compile_model(str(model_dir / 'yolo.onnx'), device, settings)
    compiled_pose = core.compile_model(str(model_dir / 'pose.onnx'), device, settings)
    for name, compiled, shape in (
        ('detector', compiled_yolo, [1, 3, detector_size, detector_size]),
        ('pose', compiled_pose, [1, 3, 256, 192]),
    ):
        if len(compiled.inputs) != 1 or list(compiled.input(0).shape) != shape:
            raise ValueError(f'Invalid {name} model input. Re-export the models.')
    if list(compiled_pose.output(0).shape) != [1, 17, 64, 48]:
        raise ValueError('The exported pose model must produce 17 COCO heatmaps.')

    def infer(compiled, images):
        if images.ndim != 4:
            raise ValueError('Expected a batch of NCHW images.')
        # Fixed batch-one exports avoid recompilation as people enter/leave.
        # Copy each result because OpenVINO reuses its output buffer.
        return torch.cat([
            torch.from_numpy(compiled([image.detach().cpu().numpy()])[0].copy())
            for image in images.split(1)
        ])

    original_build = builder.build_sppe
    original_load = YOLODetector.load_model
    original_queue = webcam_detector.Queue

    class CameraQueue(original_queue):
        def full(self):
            full = super().full()
            if full:
                # The upstream camera reader busy-polls a full queue. With a
                # fast detector this starves Python model initialization and
                # postprocessing; yield briefly while keeping the queue small.
                sleep(0.002)
            return full

    def build_pose(*args, **kwargs):
        model = original_build(*args, **kwargs)
        model.forward = lambda images: infer(compiled_pose, images)
        return model

    def load_detector(detector):
        original_load(detector)
        detector.model.forward = lambda images, args=None: infer(compiled_yolo, images)

    builder.build_sppe = build_pose
    YOLODetector.load_model = load_detector
    webcam_detector.Queue = CameraQueue
    print(f'OpenVINO {device} ready; detector input {detector_size}px. Scoring and pose postprocessing use the original code.', flush=True)

    def restore():
        builder.build_sppe = original_build
        YOLODetector.load_model = original_load
        webcam_detector.Queue = original_queue

    return restore
