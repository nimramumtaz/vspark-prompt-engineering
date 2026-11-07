@echo off
title VSPARK 2026 - Prompt Engineering Portal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install Node.js 18 or newer from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies, please wait...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting the portal at http://localhost:3000
echo Close this window or press Ctrl+C to stop the server.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
call npm start
pause
