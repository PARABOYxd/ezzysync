@echo off
cd /d "%~dp0"
node scripts/run-adversarial-qa.js --headed
pause
