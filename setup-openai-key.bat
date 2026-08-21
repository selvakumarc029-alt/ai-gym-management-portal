@echo off
cd /d "%~dp0"
echo Paste your OpenAI API key below. It will be saved only in this local .env file.
set /p OPENAI_KEY=OpenAI API key: 
if "%OPENAI_KEY%"=="" (
  echo No key entered. Setup cancelled.
  pause
  exit /b 1
)
(
  echo OPENAI_API_KEY=%OPENAI_KEY%
  echo OPENAI_MODEL=gpt-5.2
  echo PORT=8787
) > ".env"
echo.
echo Saved .env successfully.
echo Starting OpenAI proxy now...
"C:\Users\ELCOT\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" openai-proxy.js
pause
