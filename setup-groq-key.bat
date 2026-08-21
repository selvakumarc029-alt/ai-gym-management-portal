@echo off
cd /d "%~dp0"
echo Paste your Groq API key below. It will be saved only in this local .env file.
set /p GROQ_KEY=Groq API key: 
if "%GROQ_KEY%"=="" (
  echo No key entered. Setup cancelled.
  pause
  exit /b 1
)
echo %GROQ_KEY% | findstr /i /b "http:// https:// ws:// wss://" >nul
if not errorlevel 1 (
  echo.
  echo That is a URL, not a Groq API key.
  echo Get your key from https://console.groq.com/keys
  pause
  exit /b 1
)
(
  echo GROQ_API_KEY=%GROQ_KEY%
  echo GROQ_MODEL=llama-3.1-8b-instant
  echo GROQ_PORT=8788
) > ".env"
echo.
echo Saved .env successfully.
echo Starting Groq proxy now...
"C:\Users\ELCOT\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" groq-proxy.js
pause
