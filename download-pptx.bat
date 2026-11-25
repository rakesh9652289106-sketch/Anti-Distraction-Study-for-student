@echo off
title FocusFlow PPTX Generator
echo =========================================================
echo   Generating FocusFlow Review-II PowerPoint Presentation
echo =========================================================
echo.
echo Opening presentation generator in your default browser...
start "" "%~dp0generate_presentation.html"
echo.
echo The presentation will automatically build and download into your Downloads folder!
timeout /t 3 >nul
