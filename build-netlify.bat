@echo off
echo ========================================================
echo   TubeVault - Building Direct Netlify Deployment Folder
echo ========================================================
echo.

echo [1/3] Building frontend production bundle...
cd /d %~dp0frontend
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Updating netlify-deploy folder...
cd /d %~dp0
if exist netlify-deploy rmdir /s /q netlify-deploy
xcopy /E /I /Y "frontend\dist" "netlify-deploy"

echo.
echo [3/3] Done! 
echo ========================================================
echo  Folder ready: %~dp0netlify-deploy
echo.
echo  Ab aap "netlify-deploy" folder ko seedha
echo  https://app.netlify.com/drop par drag-and-drop kar sakte hain!
echo ========================================================
pause
