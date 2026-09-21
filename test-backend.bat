@echo off
setlocal
title EzzySync / LeadCRM - Backend API ^& System QA Test Suite
color 0b

set ROOT_DIR=%~dp0
if "%ROOT_DIR:~-1%"=="\" set ROOT_DIR=%ROOT_DIR:~0,-1%
cd /d "%ROOT_DIR%"

echo ===============================================================================
echo            EZZYSYNC / LEADCRM - BACKEND API QA TEST SUITE
echo ===============================================================================
echo.

rem Check if Backend is running
echo [*] Checking Backend API on port 5001...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/api/health' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Backend server is NOT running. Starting Backend in background...
    start "EzzySync Backend Server" /min cmd /c "cd /d \"%ROOT_DIR%\backend\" && node server.js"
    echo [*] Waiting 3 seconds for Backend to initialize...
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend server is running on port 5001.
)

echo.
echo [*] Running Backend QA Suite (API Security, Routes, Fuzzing ^& Error Monitors)...
echo.
cd /d "%ROOT_DIR%\qa"
call node scripts/run-qa.js %*

echo.
pause
