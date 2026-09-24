@echo off
echo ===================================================
echo   TubeVault - Allow Ports in Windows Firewall
echo ===================================================
echo.
echo Requesting administrator privileges to add firewall rules...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTE] Please right-click this file and select "Run as administrator" to apply firewall rules.
    pause
    exit /b 1
)

echo Allowing port 5173 (Frontend)...
netsh advfirewall firewall add rule name="TubeVault Frontend (5173)" dir=in action=allow protocol=TCP localport=5173 profile=any

echo Allowing port 8000 (Backend)...
netsh advfirewall firewall add rule name="TubeVault Backend (8000)" dir=in action=allow protocol=TCP localport=8000 profile=any

echo.
echo ===================================================
echo Firewall rules added successfully!
echo Mobile devices on your Wi-Fi can now connect.
echo ===================================================
pause
