@echo off
setlocal enabledelayedexpansion
title EzzySync / LeadCRM - Backend API ^& System QA Test Suite
color 0b

set QA_DIR=%~dp0
if "%QA_DIR:~-1%"=="\" set QA_DIR=%QA_DIR:~0,-1%
set ROOT_DIR=%QA_DIR%\..

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
echo [*] Running Backend API, Database Sync, RBAC Permissions ^& Security Tests...
echo.

cd /d "%QA_DIR%"
call npx playwright test tests/e2e/fullstack-sync.spec.js tests/e2e/advanced-rbac-permissions.spec.js tests/e2e/settings-rules.spec.js tests/e2e/triggers-automation.spec.js

set TEST_EXIT_CODE=%errorlevel%

echo.
if %TEST_EXIT_CODE% equ 0 (
    color 0a
    echo ===============================================================================
    echo                    [SUCCESS] ALL BACKEND TESTS PASSED!
    echo ===============================================================================
) else (
    color 0c
    echo ===============================================================================
    echo                       [INFO] BACKEND TEST RUN FINISHED
    echo ===============================================================================
)

echo.
echo -------------------------------------------------------------------------------
echo [V] View Interactive HTML Report in Browser
echo [E] Exit
echo -------------------------------------------------------------------------------
choice /c VE /n /m "Choose [V/E] (Auto-exits in 15s): " /t 15 /d E

if errorlevel 2 goto END
if errorlevel 1 goto VIEW_REPORT

:VIEW_REPORT
start "" "%QA_DIR%\reports\e2e-html\index.html"

:END
echo.
pause
