@echo off
cd /d "%~dp0"
set "TORCH_HOME=%~dp0.cache\torch"
set "MPLCONFIGDIR=%~dp0.cache\matplotlib"
set "PYTHONUTF8=1"
set "OMP_NUM_THREADS=4"
".venv\Scripts\python.exe" alphapose_bridge.py camera --repo external\AlphaPose --show-camera %*
