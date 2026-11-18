@echo off
rem Uppdaterar radstrat i den har mappen till senaste versionen pa GitHub. Fragar innan nagot andras.
chcp 65001 >nul
cd /d "%~dp0"
title radstrat - uppdatera
set "REPO=https://github.com/ariyakongkam/csrecap.git"
set "BRANCH=claude/hopeful-edison-tja98v"

where git >nul 2>nul
if errorlevel 1 (
  echo Git är inte installerat. Installera det från git-scm.com och kör den här filen igen.
  start "" https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist .git (
  git init -q
  git remote add origin %REPO%
)

echo Hämtar senaste versionen från GitHub...
git fetch -q origin %BRANCH%
if errorlevel 1 (
  echo Kunde inte hämta. Kolla internetanslutningen och att du är inloggad på GitHub.
  pause
  exit /b 1
)
for /f %%i in ('git rev-parse FETCH_HEAD') do set "NEW=%%i"
set "CUR="
for /f %%i in ('git rev-parse -q --verify HEAD 2^>nul') do set "CUR=%%i"

if "%CUR%"=="%NEW%" (
  echo Du har redan den senaste versionen. Inget behöver ändras.
  pause
  exit /b 0
)

echo.
echo Det här är nytt:
if defined CUR (
  git log --format="  - %%s" %CUR%..%NEW%
) else (
  git log --format="  - %%s" -8 %NEW%
)
echo.
choice /c JN /m "Vill du ersätta filerna i den här mappen med den nya versionen"
if errorlevel 2 (
  echo Inget ändrades.
  pause
  exit /b 0
)

git checkout -q -f -B radstrat %NEW%
if errorlevel 1 (
  echo Något gick fel när filerna skulle ersättas. Inget har tagits bort.
  pause
  exit /b 1
)
echo Installerar det som behövs...
call npm ci --no-fund --no-audit
echo.
echo Klart! Om start.bat redan körs uppdateras sidan i webbläsaren av sig själv. Annars, kör start.bat.
pause
