@echo off
title FocusFlow Backend (Port 5002)
cd /d "%~dp0"
echo =========================================================
echo   Starting FocusFlow Backend on Port 5002
echo =========================================================
echo.
echo [Backend started at %TIME%] > "%~dp0..\backend.log"
call node dist/server.js 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath '%~dp0..\backend.log'"
if %ERRORLEVEL% neq 0 (
  echo [Error Code %ERRORLEVEL%] >> "%~dp0..\backend.log"
)
echo.
echo =========================================================
echo Backend process stopped or encountered an error.
echo =========================================================
pause
