@echo off
setlocal
cd /d "%~dp0.."
if not exist "frontend\node_modules\@sveltejs\kit\package.json" (
  call npm.cmd --prefix frontend ci
  if errorlevel 1 exit /b 1
)
call npm.cmd --prefix frontend run build
if errorlevel 1 exit /b 1
python -m backend.tracker.server %*
