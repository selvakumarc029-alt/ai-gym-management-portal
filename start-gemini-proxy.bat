@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Missing .env file.
  echo Run setup-gemini-key.bat first, then start this again.
  pause
  exit /b 1
)
"C:\Users\ELCOT\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" gemini-proxy.js
pause
