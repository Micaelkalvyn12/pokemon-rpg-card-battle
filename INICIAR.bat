@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando servidor local em http://localhost:8000
  start "" http://localhost:8000
  py -m http.server 8000
  pause
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando servidor local em http://localhost:8000
  start "" http://localhost:8000
  python -m http.server 8000
  pause
  exit /b
)
echo Python nao foi encontrado. Instale o Python ou abra a pasta com VS Code + Live Server.
pause
