@echo off
rem Keeps two backups of radstrat on this PC, in Documents\radstrat-backups:
rem   backup-1-newest   = the newest version on GitHub
rem   backup-2-previous = the version before it (so a bad update can always be undone)
rem Double-click it once: it makes a backup and offers to repeat it by itself every day.
setlocal
chcp 65001 >nul
title radstrat - backup
set "REPO=https://github.com/ariyakongkam/csrecap.git"
set "BRANCH=claude/hopeful-edison-tja98v"
set "DEST=%USERPROFILE%\Documents\radstrat-backups"
set "NEWEST=%DEST%\backup-1-newest"
set "PREVIOUS=%DEST%\backup-2-previous"
set "INCOMING=%DEST%\incoming"
set "LOG=%DEST%\backup-log.txt"
set "QUIET="
if /i "%~1"=="/quiet" set "QUIET=1"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install it from git-scm.com, then run this file again.
  if not defined QUIET pause
  exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"
if exist "%INCOMING%" rmdir /s /q "%INCOMING%"

echo Getting the newest radstrat from GitHub...
git clone -q --depth 1 --branch %BRANCH% %REPO% "%INCOMING%"
if errorlevel 1 goto download_failed

set "NEW="
for /f %%i in ('git -C "%INCOMING%" rev-parse --short HEAD') do set "NEW=%%i"
set "CUR="
if exist "%NEWEST%\.git" for /f %%i in ('git -C "%NEWEST%" rev-parse --short HEAD 2^>nul') do set "CUR=%%i"

if "%CUR%"=="%NEW%" goto already_newest

rem A new version: the old newest becomes backup 2, the download becomes backup 1.
if exist "%PREVIOUS%" rmdir /s /q "%PREVIOUS%"
if exist "%PREVIOUS%" goto folder_busy
if exist "%NEWEST%" move "%NEWEST%" "%PREVIOUS%" >nul
if exist "%NEWEST%" goto folder_busy
move "%INCOMING%" "%NEWEST%" >nul
>>"%LOG%" echo %DATE% %TIME%  New backup %NEW%. The version before it is now backup 2.
echo Done. Backup 1 is the newest version, %NEW%. Backup 2 is the version before it.
echo You find them in %DEST%
goto schedule

:already_newest
rmdir /s /q "%INCOMING%"
>>"%LOG%" echo %DATE% %TIME%  Already the newest version, %NEW%.
echo Backup 1 already has the newest version. Nothing needed to change.
goto schedule

:download_failed
>>"%LOG%" echo %DATE% %TIME%  Could not download. Backups were not changed.
echo Could not download. Check the internet connection. Your backups were not changed.
if not defined QUIET pause
exit /b 1

:folder_busy
if exist "%INCOMING%" rmdir /s /q "%INCOMING%"
>>"%LOG%" echo %DATE% %TIME%  A backup folder was in use. Backups were not changed.
echo A backup folder is open in another program, so nothing was changed. Close it and try again.
if not defined QUIET pause
exit /b 1

:schedule
if defined QUIET exit /b 0
rem The daily task runs a copy kept in the backup folder, so a later update can't change what runs by itself.
copy /y "%~f0" "%DEST%\radstrat-backup.bat" >nul
echo.
choice /c YN /m "Make this backup by itself every day at 12:00"
if errorlevel 2 goto end
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Join-Path $env:USERPROFILE 'Documents\radstrat-backups\radstrat-backup.bat'; $a = New-ScheduledTaskAction -Execute $p -Argument '/quiet'; $t = New-ScheduledTaskTrigger -Daily -At '12:00'; $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries; Register-ScheduledTask -TaskName 'radstrat backup' -Action $a -Trigger $t -Settings $s -Description 'Keeps two radstrat backups up to date' -Force | Out-Null"
if errorlevel 1 (
  echo Windows did not accept the daily task. You can still run this file by hand whenever you like.
) else (
  echo Done. Windows now makes the backup every day at 12:00, or as soon as the PC is on after that.
  echo To stop it: open Task Scheduler and delete the task called radstrat backup.
)

:end
echo.
pause
