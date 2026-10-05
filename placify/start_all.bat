@echo off
echo ============================================
echo   PLACIFY - Launching Full Stack Application
echo ============================================
echo.
echo Launching Backend server in separate window...
start "Placify Backend (FastAPI - Port 8000)" cmd /k "%~dp0start_backend.bat"
timeout /t 3 /nobreak >nul
echo Launching Frontend server in separate window...
start "Placify Frontend (Next.js - Port 3000)" cmd /k "%~dp0start_frontend.bat"
echo.
echo ============================================
echo Both servers started!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Docs:     http://localhost:8000/docs
echo ============================================
