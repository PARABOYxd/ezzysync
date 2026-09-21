@echo off
cd /d "%~dp0"
node run-all.js --open %*
pause
