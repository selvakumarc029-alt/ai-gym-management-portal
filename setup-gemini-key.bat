@echo off
cd /d "%~dp0"
echo Paste your Gemini API key below. It will be saved only in this local .env file.
set /p GEMINI_KEY=Gemini API key: 
if "%GEMINI_KEY%"=="" (
  echo No key entered. Setup cancelled.
  pause
  exit /b 1
)
echo %GEMINI_KEY% | findstr /i /b "http:// https:// ws:// wss://" >nul
if not errorlevel 1 (
  echo.
  echo That is a URL, not a Gemini API key.
  echo Get your key from https://aistudio.google.com/app/apikey
  echo The key usually starts with AIza.
  pause
  exit /b 1
)
(
  echo GEMINI_API_KEY=%GEMINI_KEY%
  echo GEMINI_MODEL=gemini-2.0-flash
  echo GEMINI_PORT=8788
) > ".env"
echo.
echo Saved .env successfully.
echo Starting Gemini proxy now...
"C:\Users\ELCOT\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" gemini-proxy.js
pause
