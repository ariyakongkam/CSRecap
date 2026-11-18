@echo off
rem Builds radstrat as a website and puts it in hosting\site, ready for serve.bat.
rem Run it again after update.bat to put the newest version online.
cd /d "%~dp0"
title radstrat - publish

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from nodejs.org, then run this file again.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

set "DOMAIN="
if exist hosting\domain.txt set /p DOMAIN=<hosting\domain.txt
if not defined DOMAIN (
  echo Which domain should radstrat run on? Type it without https:// - for example: radstrat.gg
  set /p DOMAIN=Domain: 
)
if not defined DOMAIN (
  echo No domain given. Nothing was changed.
  pause
  exit /b 1
)
rem Accept "https://radstrat.gg/" too: keep just the domain.
set "DOMAIN=%DOMAIN:https://=%"
set "DOMAIN=%DOMAIN:http://=%"
set "DOMAIN=%DOMAIN:/=%"
set "DOMAIN=%DOMAIN: =%"
> hosting\domain.txt echo %DOMAIN%

echo.
choice /c YN /m "Build radstrat for https://%DOMAIN% and replace the published site"
if errorlevel 2 (
  echo Nothing was changed.
  pause
  exit /b 0
)

if not exist node_modules (
  echo Installing what the app needs. This takes a minute or two...
  call npm install --no-fund --no-audit
)

echo Building the site...
set "NEXT_PUBLIC_SITE_URL=https://%DOMAIN%"
call npm run export
if errorlevel 1 (
  echo Building failed. Nothing was published. Send a screenshot of this window to Claude.
  pause
  exit /b 1
)

robocopy out hosting\site /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo Copying the site failed. Is a file in hosting\site open somewhere?
  pause
  exit /b 1
)
echo The site is ready in hosting\site.

if not exist hosting\caddy.exe (
  echo.
  echo To put it online you need Caddy, a free web server that also sets up HTTPS.
  choice /c YN /m "Download Caddy from caddyserver.com now"
  if not errorlevel 2 (
    curl -fL -o hosting\caddy.exe "https://caddyserver.com/api/download?os=windows&arch=amd64"
    if errorlevel 1 echo The download failed. Get caddy.exe from caddyserver.com/download and put it in the hosting folder.
  )
)

echo.
echo Done. If serve.bat is already running, the new version is live now.
echo Otherwise, start serve.bat and keep its window open.
pause
