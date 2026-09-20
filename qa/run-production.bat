@echo off
cd /d "%~dp0"
node scripts/run-production-qa.js --headed
pause
