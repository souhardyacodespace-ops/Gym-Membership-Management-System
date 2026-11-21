@echo off
title Gym Member & Fast Billing Management
echo Starting Gym Billing Desktop Application...
cd /d "%~dp0"
if exist "%~dp0node_modules\electron\dist\electron.exe" (
  start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
  exit /b 0
)
npm start
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Electron could not start. Run npm install in this folder first.
  pause
)
pause
