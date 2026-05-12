@echo off
REM Start ML Service on Windows
REM Requires: Python 3.10+, dependencies installed from requirements.txt

setlocal enabledelayedexpansion

REM Get Python executable
set PYTHON_PATH=C:\Users\IBRAHIM\AppData\Local\Programs\Python\Python310\python.exe

REM Check if Python exists
if not exist "%PYTHON_PATH%" (
    echo ❌ Python not found at: %PYTHON_PATH%
    echo Please install Python 3.10+ and update this script
    exit /b 1
)

REM Set environment variables
set ML_PORT=5000
set PYTHONUNBUFFERED=1

REM Print startup info
echo ========================================================
echo 🚀 Starting TrustLayer ML Service
echo ========================================================
echo Python: %PYTHON_PATH%
echo Port:   %ML_PORT%
echo.

REM Start server
echo Starting Uvicorn server...
"%PYTHON_PATH%" -m uvicorn app:app --host 0.0.0.0 --port %ML_PORT% --reload

echo.
echo ========================================================
echo 🛑 ML Service stopped
echo ========================================================
