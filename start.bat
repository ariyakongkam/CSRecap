@echo off
rem Starts radstrat, the CS2 tactics board, on this PC.
rem Double-click this file. Close the window (or press Ctrl+C) to stop the app.
cd /d "%~dp0"
title radstrat - CS2 tactics board

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from nodejs.org, then run this file again.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

rem The marker is written after a complete install, so a half-finished one is redone.
if not exist node_modules\.radstrat-ok (
  echo Installing what the app needs. This takes a minute or two...
  call npm ci --no-fund --no-audit
  if errorlevel 1 (
    echo Installing failed. Close other radstrat windows, check your internet connection and try again.
    pause
    exit /b 1
  )
  echo ok> node_modules\.radstrat-ok
)

echo Starting radstrat at http://localhost:3000 - your browser will open in a few seconds.
echo Keep this window open while you use the app.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
