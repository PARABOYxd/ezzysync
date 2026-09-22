@echo off
rem ============================================================================
rem  BACKEND QA - no servers needed.
rem  Preflight, the backend vitest suite (real Postgres), and ~14,500 generated
rem  API cases against a throwaway database it creates and drops.
rem ============================================================================
setlocal
title EzzySync QA - Backend
cd /d "%~dp0"

set OPEN=--open
if defined QA_NO_OPEN set OPEN=
call node run-all.js %OPEN%
set RESULT=%errorlevel%

if not defined QA_NO_PAUSE pause
exit /b %RESULT%
