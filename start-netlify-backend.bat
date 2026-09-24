@echo off
setlocal
echo =============================================================
echo   TubeVault - Connect Backend to Netlify Website
echo =============================================================
echo.

:: 1. Check & Launch Backend if not already running
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [1/2] Starting TubeVault Python Backend on Port 8000...
    start "TubeVault Backend" cmd /k "cd /d ""%~dp0backend"" && ""%~dp0backend\venv\Scripts\python.exe"" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [1/2] Backend is already running on Port 8000.
)

:: 2. Launch Cloudflare Tunnel specifically for Backend (Port 8000)
echo.
echo =============================================================
echo [2/2] Launching Backend Public Tunnel for Netlify...
echo.
echo  -----------------------------------------------------------
echo  KAAM KAISE KAREGA:
echo  1. Neeche thodi der me "https://....trycloudflare.com" link aayega.
echo  2. Use COPY karein aur apni Netlify website par jakar
echo     upar "Server" button par click karke PASTE karein!
echo     aur "Save & Connect" dabayein!
echo.
echo  Isse aapki Netlify website aapke laptop se connect ho jayegi
echo  aur YouTube Search aur saare Downloads chalne lagenge!
echo  -----------------------------------------------------------
echo =============================================================
echo.

"%~dp0cloudflared.exe" tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8000

echo.
echo Backend Tunnel closed.
pause
