@echo off
setlocal enabledelayedexpansion
title EzzySync / LeadCRM - Complete Frontend Automated Test Suite
color 0b

set QA_DIR=%~dp0
if "%QA_DIR:~-1%"=="\" set QA_DIR=%QA_DIR:~0,-1%
set ROOT_DIR=%QA_DIR%\..

cd /d "%ROOT_DIR%"

echo ===============================================================================
echo            EZZYSYNC / LEADCRM - COMPLETE FRONTEND QA TEST SUITE
echo ===============================================================================
echo.

rem Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js is not found in PATH!
    pause
    exit /b 1
)

rem Check Backend
echo [*] Checking Backend API on port 5001...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/api/health' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Backend server is NOT running. Starting Backend in background...
    start "EzzySync Backend Server" /min cmd /c "cd /d \"%ROOT_DIR%\backend\" && node server.js"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend server is running on port 5001.
)

rem Check Frontend
echo [*] Checking Frontend Dev Server on port 5173...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Frontend server is NOT running. Starting Frontend in background...
    start "EzzySync Frontend Server" /min cmd /c "cd /d \"%ROOT_DIR%\frontend\" && npm run dev"
    timeout /t 4 /nobreak >nul
) else (
    echo [OK] Frontend server is running on port 5173.
)

echo.
echo ===============================================================================
echo                           CHOOSE SPEED ^& TEST MODE
echo ===============================================================================
echo  [1] SLOW MOTION (Aankhon ke samne slow ^& clear dikhega, 1 Window, 700ms delay)
echo  [2] FAST LIVE BROWSER (Real-time speed, live Chrome popup)
echo  [3] TURBO BACKGROUND (Fastest, background headless)
echo ===============================================================================
choice /c 123 /n /t 10 /d 1 /m "Your Choice [1/2/3] (Default: 1 in 10s): "

cd /d "%QA_DIR%"

if errorlevel 3 goto MODE_HEADLESS
if errorlevel 2 goto MODE_FAST
if errorlevel 1 goto MODE_SLOW

:MODE_SLOW
echo.
echo [*] Starting in SLOW MOTION (700ms delay, 1 clean browser window)...
set SLOWMO=700
set HEADLESS=false
set WORKERS=1
call npx playwright test --headed
goto POST_TEST

:MODE_FAST
echo.
echo [*] Starting in FAST LIVE BROWSER MODE...
set SLOWMO=
set HEADLESS=false
call npx playwright test --headed
goto POST_TEST

:MODE_HEADLESS
echo.
echo [*] Starting in TURBO BACKGROUND MODE (Fastest headless)...
set SLOWMO=
set HEADLESS=true
call npx playwright test
goto POST_TEST

:POST_TEST
set TEST_EXIT_CODE=%errorlevel%

echo.
if %TEST_EXIT_CODE% equ 0 (
    color 0a
    echo ===============================================================================
    echo                     [SUCCESS] ALL FRONTEND TESTS COMPLETED!
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
start "" "%QA_DIR%\reports\e2e-html\index.html"

:END
echo.
pause
