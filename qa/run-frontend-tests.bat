@echo off
setlocal
cd /d "%~dp0.."
if exist "test-frontend.bat" (
    call "test-frontend.bat" %*
) else (
    echo [ERROR] test-frontend.bat not found in root directory!
    pause
)
