@echo off
echo ============================================
echo   PLACIFY - Starting Backend Server
echo ============================================
cd /d "%~dp0backend"
echo.
if not exist "placify.db" (
    echo [1/2] Database not found. Seeding initial data...
    python seed_data.py
) else (
    echo [1/2] Database verified (placify.db exists).
)
echo.
echo [2/2] Starting FastAPI server on http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
