# Run: powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-alphapose.ps1
# Requires uv, git, curl.exe, tar.exe, and the existing MSYS2 UCRT64 GCC compiler.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE" } }
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { throw 'Install uv first: https://docs.astral.sh/uv/' }
if (-not (Get-Command gcc -ErrorAction SilentlyContinue)) { throw 'Add MSYS2 UCRT64 bin (C:\msys64\ucrt64\bin) to PATH first.' }
New-Item -ItemType Directory -Force .cache/sources, .cache/torch/hub/checkpoints, external | Out-Null
if (-not (Test-Path external/AlphaPose/setup.py)) {
    git clone https://github.com/MVIG-SJTU/AlphaPose.git external/AlphaPose
    Check-Exit
    git -C external/AlphaPose checkout c60106d19afb443e964df6f06ed1842962f5f1f7
    Check-Exit
}
if (-not (Test-Path .venv/Scripts/python.exe)) { uv venv --python 3.10 .venv; Check-Exit }
$alphaPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
uv pip install --python $alphaPython torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu121
Check-Exit
uv pip install --python $alphaPython -r requirements-alphapose.txt
Check-Exit
uv pip install --python $alphaPython --no-build-isolation visdom==0.2.4
Check-Exit
& $alphaPython -m pip download --no-deps --no-build-isolation --no-binary :all: --dest .cache/sources cython-bbox==0.1.5 halpecocotools==0.0.0
Check-Exit
foreach ($package in @('cython_bbox-0.1.5', 'halpecocotools-0.0.0')) {
    tar -xf ".cache/sources/$package.tar.gz" -C .cache/sources
    Check-Exit
    @('[build]', 'compiler=mingw32', '[build_ext]', 'compiler=mingw32', 'define=MS_WIN64') | Set-Content ".cache/sources/$package/setup.cfg"
}
$bboxSetup = '.cache/sources/cython_bbox-0.1.5/setup.py'
(Get-Content -Raw $bboxSetup).Replace("{'gcc': ['/Qstd=c99']}", "['-std=c99', '-DMS_WIN64', '-static-libgcc']") | Set-Content $bboxSetup
uv pip install --python $alphaPython --no-build-isolation --no-deps .cache/sources/cython_bbox-0.1.5 .cache/sources/halpecocotools-0.0.0
Check-Exit
uv pip install --python $alphaPython --no-build-isolation --no-deps -e external/AlphaPose
Check-Exit
New-Item -ItemType Directory -Force external/AlphaPose/detector/yolo/data | Out-Null
function Download-Model($url, $destination, $hash) {
    if ((Test-Path $destination) -and (Get-FileHash $destination -Algorithm SHA256).Hash -eq $hash) { return }
    curl.exe -L --fail --output $destination $url
    Check-Exit
    if ((Get-FileHash $destination -Algorithm SHA256).Hash -ne $hash) { throw "Checksum mismatch: $destination" }
}
Download-Model 'https://pjreddie.com/media/files/yolov3-spp.weights' 'external/AlphaPose/detector/yolo/data/yolov3-spp.weights' '87a1e8c85c763316f34e428f2295e1db9ed4abcec59dd9544f8052f50de327b4'
Download-Model 'https://download.pytorch.org/models/resnet50-0676ba61.pth' '.cache/torch/hub/checkpoints/resnet50-0676ba61.pth' '0676ba61b6795bbe1773cffd859882e5e297624d384b6993f7c9e683e722fb8a'
$poseFile = 'external/AlphaPose/pretrained_models/fast_res50_256x192.pth'
$poseHash = '42808e905aa20133a89a6a2cba073265a2ce35fabe65edffd9f153ef5846b7b0'
if (-not (Test-Path $poseFile) -or (Get-FileHash $poseFile -Algorithm SHA256).Hash -ne $poseHash) {
    & $alphaPython -m gdown 1kQhnMRURFiy7NsdS8EFL-8vtqEXOgECn -O $poseFile
    Check-Exit
    if ((Get-FileHash $poseFile -Algorithm SHA256).Hash -ne $poseHash) { throw 'Pose checkpoint checksum mismatch' }
}
uv pip check --python $alphaPython
Check-Exit
& $alphaPython -c "import torch; assert torch.cuda.is_available(); print('Ready:', torch.cuda.get_device_name(0))"
Check-Exit
Write-Host 'Installed. Run start-dashboard.cmd and start a live camera session; its preview opens automatically.'
