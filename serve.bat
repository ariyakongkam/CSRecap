@echo off
rem Puts csgg online at your domain. Keep this window open: closing it takes the site offline.
cd /d "%~dp0"
title csgg - online

if not exist hosting\site\index.html (
  echo The site isn't built yet. Run publish.bat first.
  pause
  exit /b 1
)
if not exist hosting\caddy.exe (
  echo Caddy is missing. Run publish.bat and answer Y to download it.
  pause
  exit /b 1
)
set "CSGG_DOMAIN="
set /p CSGG_DOMAIN=<hosting\domain.txt
set "CSGG_SITE=%~dp0hosting\site"
rem Caddy reads forward slashes on Windows too, and they never clash with its quoting.
set "CSGG_SITE=%CSGG_SITE:\=/%"

echo Starting csgg at https://%CSGG_DOMAIN%
echo If Windows asks about the firewall, click Allow.
echo Keep this window open. Press Ctrl+C to stop.
echo.
hosting\caddy.exe run --config hosting\Caddyfile --adapter caddyfile
pause
