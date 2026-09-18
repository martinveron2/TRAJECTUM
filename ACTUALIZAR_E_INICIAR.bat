@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo [TRAJECTUM] Verificando herramientas...
where git >nul 2>&1 || (echo [ERROR] Falta Git. & pause & exit /b 1)
where python >nul 2>&1 || (echo [ERROR] Falta Python 3.11+. & pause & exit /b 1)
where npm >nul 2>&1 || (echo [ERROR] Falta Node.js/npm. & pause & exit /b 1)

echo.
echo [TRAJECTUM] Actualizando desde GitHub main...
git -C "%ROOT%" fetch origin || goto :giterror
git -C "%ROOT%" checkout main || goto :giterror
git -C "%ROOT%" pull --ff-only origin main || goto :giterror

set "TRAJECTUM_HOME=%ROOT%"
set "TRAJECTUM_SKIP_UPDATE=1"

echo.
echo [TRAJECTUM] Iniciando version actualizada...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\local_start.ps1"
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" echo [TRAJECTUM] Finalizo con codigo %CODE%.
pause
exit /b %CODE%

:giterror
echo.
echo [ERROR] No se pudo actualizar TRAJECTUM desde GitHub.
echo Revisa conexion o cambios locales sin guardar.
pause
exit /b 1
