Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting TubeVault Backend and Frontend Servers  " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# Determine local IP address for phone connectivity
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Wireless*' } | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -ExpandProperty IPAddress -First 1)
}

# Start Backend on 0.0.0.0
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd `"$root\backend`"; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Start Frontend on 0.0.0.0
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd `"$root\frontend`"; npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host "`n===================================================" -ForegroundColor Green
Write-Host "  TubeVault is Ready for Laptop and Mobile Phone!   " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Laptop Browser: http://localhost:5173" -ForegroundColor Yellow
if ($localIp) {
    Write-Host "Mobile Phone:   http://${localIp}:5173" -ForegroundColor Cyan
    Write-Host "(Open the Mobile Phone link in your phone's browser connected to the same Wi-Fi)" -ForegroundColor DarkGray
}
Write-Host "Backend API:    http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "===================================================`n" -ForegroundColor Green
