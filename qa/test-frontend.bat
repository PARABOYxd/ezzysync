@echo off
rem ============================================================================
rem  FRONTEND QA - real browser, real UI, no AI.
rem  Playwright tests in tests\e2e against the running app. Starts the backend
rem  (5001) and the frontend (5173) if they are not already up. Each test makes
rem  its own temporary tenant in your dev database and deletes it afterwards.
rem ============================================================================
setlocal
title EzzySync QA - Frontend
cd /d "%~dp0"
set ROOT=%~dp0..

echo [*] Making sure the Playwright browser is installed...
call npx playwright install chromium >nul 2>nul

call :ensure_up "http://localhost:5001/api/health" "Backend on 5001" "%ROOT%\backend" "node server.js" 8
if errorlevel 1 exit /b 1
call :ensure_up "http://localhost:5173" "Frontend on 5173" "%ROOT%\frontend" "npm run dev" 15
if errorlevel 1 exit /b 1

echo.
echo  [1] Full        - every page, role, button and form + business flows, background (default)
echo  [2] Quick       - business flows only (tests\e2e), about a minute
echo  [3] Live        - full run, watch the browser
echo  [4] Slow motion - business flows, one window, 700ms per step
choice /c 1234 /n /t 8 /d 1 /m "Mode [1/2/3/4] (1 in 8s): "
set MODE=%errorlevel%
set HEADLESS=true
set SLOWMO=
set WORKERS=4
set HEADED=
set SCOPE=
if %MODE%==2 set SCOPE=tests/e2e& set WORKERS=3
if %MODE%==3 set HEADLESS=false& set HEADED=--headed
if %MODE%==4 set SCOPE=tests/e2e& set HEADLESS=false& set HEADED=--headed& set SLOWMO=700& set WORKERS=1

echo.
call npx playwright test %SCOPE% %HEADED%
set RESULT=%errorlevel%

if %RESULT%==0 (echo. & echo [OK] All frontend tests passed.) else (echo. & echo [!!] Some frontend tests failed - see the report.)
if not defined QA_NO_OPEN (
    if %MODE%==1 start "" "%~dp0reports\ui-matrix-report.html"
    if %MODE%==3 start "" "%~dp0reports\ui-matrix-report.html"
    start "" "%~dp0reports\e2e-html\index.html"
)

if not defined QA_NO_PAUSE pause
exit /b %RESULT%

rem ---------------------------------------------------------------------------
rem  :ensure_up URL NAME DIR COMMAND WAIT_SECONDS
rem ---------------------------------------------------------------------------
:ensure_up
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%~1' -TimeoutSec 2 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 (
    echo [OK] %~2 is running.
    exit /b 0
)
echo [*] %~2 is not running - starting it...
start "EzzySync %~2" /min cmd /c "cd /d "%~3" && %~4"
for /l %%i in (1,1,%~5) do (
    timeout /t 2 /nobreak >nul
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%~1' -TimeoutSec 2 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
        echo [OK] %~2 is up.
        exit /b 0
    )
)
echo [ERROR] %~2 did not start. Check the minimised "EzzySync %~2" window.
if not defined QA_NO_PAUSE pause
exit /b 1
