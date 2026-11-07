@echo off
setlocal
cd /d "%~dp0"
if not exist "..\.venv-alphapose\Scripts\python.exe" (
  echo The installed AlphaPose environment was not found beside this project.
  echo See docs\WINDOWS_ALPHAPOSE.md for setup instructions.
  exit /b 1
)
set "PYTHONUTF8=1"
set "TORCH_HOME=%CD%\..\.torch"
set "MPLCONFIGDIR=%CD%\..\.matplotlib"
set "OMP_NUM_THREADS=4"
"..\.venv-alphapose\Scripts\python.exe" -u alphapose_bridge.py camera --repo "..\AlphaPose" --openvino-device GPU --cpu-threads 4 --show-camera --diagnostics data/tracking-diagnostics.json %*
