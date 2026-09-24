@echo off
setlocal
echo ===================================================
echo   TubeVault - Local Super-Fast Launcher
echo ===================================================
echo.

:: 1. Launch Backend
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [1/2] Launching Backend Server on Port 8000...
    start "TubeVault Backend" cmd /k "cd /d ""%~dp0backend"" && ""%~dp0backend\venv\Scripts\python.exe"" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    ping 127.0.0.1 -n 3 >nul
) else (
    echo [1/2] Backend already running on Port 8000.
)

:: 2. Launch Frontend
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [2/2] Launching Frontend Server on Port 5173...
    start "TubeVault Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0 --port 5173"
    ping 127.0.0.1 -n 3 >nul
) else (
    echo [2/2] Frontend already running on Port 5173.
)

:: 3. Open in Browser
echo.
echo ===================================================
echo Opening TubeVault in your browser...
echo.
echo Laptop Link:      http://localhost:5173
echo Same Wi-Fi Mobile: http://172.20.10.11:5173
echo ===================================================
timeout /t 2 >nul
start http://localhost:5173
