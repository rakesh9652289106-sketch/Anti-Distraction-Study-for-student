@echo off
title FocusFlow Frontend (Port 8002)
cd /d "%~dp0"
echo =========================================================
echo   Starting FocusFlow Frontend on Port 8002
echo =========================================================
echo.
echo [Frontend started at %TIME%] > "%~dp0..\frontend.log"
call npm run dev 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath '%~dp0..\frontend.log'"
if %ERRORLEVEL% neq 0 (
  echo [Error Code %ERRORLEVEL%] >> "%~dp0..\frontend.log"
)
echo.
echo =========================================================
echo Frontend process stopped or encountered an error.
echo =========================================================
pause
