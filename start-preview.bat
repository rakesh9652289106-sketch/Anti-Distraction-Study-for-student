@echo off
setlocal enabledelayedexpansion
title FocusFlow Launcher
cd /d "%~dp0"

echo ======================================================== > "%~dp0launch.log"
echo FOCUSFLOW LAUNCH LOG - %DATE% %TIME% >> "%~dp0launch.log"
echo Folder: %CD% >> "%~dp0launch.log"
echo. >> "%~dp0launch.log"

echo Node path and version: >> "%~dp0launch.log"
where node >> "%~dp0launch.log" 2>&1
call node -v >> "%~dp0launch.log" 2>&1

echo NPM path and version: >> "%~dp0launch.log"
where npm >> "%~dp0launch.log" 2>&1
call npm -v >> "%~dp0launch.log" 2>&1

echo =========================================================
echo   FocusFlow - AI Study Sentinel Localhost Launcher
echo =========================================================
echo.
echo [1/2] Launching Backend Server on Port 5002...
start "FocusFlow Backend (5002)" "%~dp0backend\run-backend.bat"

echo [2/2] Launching Frontend Next.js Server on Port 8002...
start "FocusFlow Frontend (8002)" "%~dp0frontend\run-frontend.bat"

echo.
echo =========================================================
echo   Both services are launching in separate windows!
echo   - Backend:  http://localhost:5002
echo   - Frontend: http://localhost:8002
echo =========================================================
echo.
echo Waiting 6 seconds for Next.js to start, then opening browser...
timeout /t 6 /nobreak >nul
start http://localhost:8002
