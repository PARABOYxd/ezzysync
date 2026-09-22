@echo off
rem ============================================================================
rem  BOTH - backend QA first (no servers needed), then frontend QA.
rem  Frontend runs even if backend found problems, so one run shows everything.
rem ============================================================================
setlocal
title EzzySync QA - Backend + Frontend
cd /d "%~dp0"
set QA_NO_PAUSE=1

echo ============================== BACKEND ==============================
call "%~dp0test-backend.bat"
set BACKEND=%errorlevel%

echo.
echo ============================== FRONTEND =============================
call "%~dp0test-frontend.bat"
set FRONTEND=%errorlevel%

echo.
echo =============================== RESULT ==============================
if %BACKEND%==0 (echo  Backend  : PASS) else (echo  Backend  : FAIL)
if %FRONTEND%==0 (echo  Frontend : PASS) else (echo  Frontend : FAIL)
echo =====================================================================
pause
if %BACKEND%==0 if %FRONTEND%==0 exit /b 0
exit /b 1
