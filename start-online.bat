@echo off
setlocal
echo =============================================================
echo   TubeVault - Starting Online Public Tunnel (Worldwide Access)
echo =============================================================
echo.

:: 1. Check & Launch Backend if not already running
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting Backend on Port 8000...
    start "TubeVault Backend" cmd /k "cd /d ""%~dp0backend"" && ""%~dp0backend\venv\Scripts\python.exe"" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [1/3] Backend is already running on Port 8000.
)

:: 2. Check & Launch Frontend if not already running
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [2/3] Starting Frontend on Port 5173...
    start "TubeVault Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0 --port 5173"
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [2/3] Frontend is already running on Port 5173.
)

:: 3. Launch Cloudflare Tunnel
echo.
echo =============================================================
echo [3/3] Launching Global Cloudflare Public Tunnel...
echo.
echo  -- IMPORTANT --
echo  Neeche thodi der me "https://....trycloudflare.com" link aayega,
echo  use copy karke apne phone me ya kisi ko bhi bhej dijiye!
echo  Yeh link poori duniya me chalega aur downloads bhi honge.
echo  Jab tak ye window khuli hai, website online rahegi.
echo =============================================================
echo.

"%~dp0cloudflared.exe" tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:5173

echo.
echo Tunnel closed.
pause
