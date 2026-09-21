@echo off
setlocal enabledelayedexpansion
title EzzySync / LeadCRM - Complete Frontend ^& Backend Automated Test Suite
color 0b

echo ===============================================================================
echo        EZZYSYNC / LEADCRM - UNIFIED FRONTEND ^& BACKEND TEST SUITE (1,202 TESTS)
echo ===============================================================================
echo.

set ROOT_DIR=%~dp0
if "%ROOT_DIR:~-1%"=="\" set ROOT_DIR=%ROOT_DIR:~0,-1%

cd /d "%ROOT_DIR%"

echo [*] Checking local test environment prerequisites...

rem 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js is not found in PATH! Please install Node.js.
    pause
    exit /b 1
)

rem 2. Check Backend Server (Port 5001)
echo [*] Checking Backend API on port 5001...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/api/health' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Backend server is NOT running. Starting Backend in background...
    start "EzzySync Backend Server (Port 5001)" /min cmd /c "cd /d \"%ROOT_DIR%\backend\" && node server.js"
    echo [*] Waiting 3 seconds for Backend to initialize...
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend server is running on port 5001.
)

rem 3. Check Frontend Server (Port 5173)
echo [*] Checking Frontend Dev Server on port 5173...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Frontend server is NOT running. Starting Frontend in background...
    start "EzzySync Frontend Dev Server (Port 5173)" /min cmd /c "cd /d \"%ROOT_DIR%\frontend\" && npm run dev"
    echo [*] Waiting 4 seconds for Frontend to compile...
    timeout /t 4 /nobreak >nul
) else (
    echo [OK] Frontend server is running on port 5173.
)

echo.
echo ===============================================================================
echo                     CHOOSE SPEED ^& RUNNER MODE (ALL 1,202 TESTS)
echo ===============================================================================
echo  [1] SLOW MOTION (Aankhon ke samne slow ^& clear dikhega, 1 Window, 700ms delay)
echo  [2] FAST LIVE BROWSER (Real-time speed, live Chrome popup)
echo  [3] PLAYWRIGHT UI STUDIO (Interactive visual dashboard with pause/play)
echo  [4] TURBO BACKGROUND (Fastest, background headless)
echo ===============================================================================
echo Select mode [1/2/3/4] (Auto-selects [1] SLOW MOTION in 10s):
choice /c 1234 /n /t 10 /d 1 /m "Your Choice [1/2/3/4]: "

if errorlevel 4 goto MODE_HEADLESS
if errorlevel 3 goto MODE_UI
if errorlevel 2 goto MODE_HEADED_FAST
if errorlevel 1 goto MODE_SLOWMO

:MODE_SLOWMO
echo.
echo [*] Starting ALL 1,202 TESTS in SLOW MOTION (700ms delay, 1 clean browser window)...
set SLOWMO=700
set HEADLESS=false
set WORKERS=1
cd /d "%ROOT_DIR%\qa"
call npx playwright test --headed
goto POST_TEST

:MODE_HEADED_FAST
echo.
echo [*] Starting ALL 1,202 TESTS in FAST LIVE BROWSER MODE...
set SLOWMO=
set HEADLESS=false
cd /d "%ROOT_DIR%\qa"
call npx playwright test --headed
goto POST_TEST

:MODE_UI
echo.
echo [*] Launching PLAYWRIGHT INTERACTIVE UI DASHBOARD...
set SLOWMO=
cd /d "%ROOT_DIR%\qa"
call npx playwright test --ui
goto POST_TEST

:MODE_HEADLESS
echo.
echo [*] Starting ALL 1,202 TESTS in TURBO BACKGROUND MODE (Fastest headless)...
set SLOWMO=
set HEADLESS=true
cd /d "%ROOT_DIR%\qa"
call npx playwright test
goto POST_TEST

:POST_TEST
set TEST_EXIT_CODE=%errorlevel%

echo.
if %TEST_EXIT_CODE% equ 0 (
    color 0a
    echo ===============================================================================
    echo          [SUCCESS] ALL 1,202 FRONTEND ^& BACKEND TESTS COMPLETED!
    echo ===============================================================================
) else (
    color 0c
    echo ===============================================================================
    echo                     [INFO] TEST RUN FINISHED
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
echo [*] Launching HTML report...
start "" "%ROOT_DIR%\qa\reports\e2e-html\index.html"

:END
echo.
pause
