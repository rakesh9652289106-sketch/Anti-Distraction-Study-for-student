@echo off
title FocusFlow PPTX Generator
cd /d "%~dp0"
echo ========================================================
echo   Building FocusFlow Review-II PowerPoint Presentation
echo ========================================================
echo.
echo Running node generator...
call node generate_ppt.js
echo.
if exist "FocusFlow_Review_II_VelTech.pptx" (
  echo ========================================================
  echo SUCCESS! File created: FocusFlow_Review_II_VelTech.pptx
  echo ========================================================
  echo Opening the PowerPoint file...
  start "" "FocusFlow_Review_II_VelTech.pptx"
) else (
  echo Something went wrong. Check the error message above.
)
echo.
pause
