@echo off
cd /d "%~dp0.."
python -m backend.tracker.server %*
