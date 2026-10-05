@echo off
echo ============================================
echo   PLACIFY - Starting Frontend Server
echo ============================================
cd /d "%~dp0frontend"
echo.
echo Starting Next.js on http://localhost:3000
echo.
npm run dev
