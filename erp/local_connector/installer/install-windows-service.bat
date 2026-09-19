@echo off
REM Anvi Mitra Local Connector Windows Service Installer
echo ========================================================
echo Installing Anvi Mitra Local Connector Background Service
echo ========================================================

node "%~dp0..\src\connector.js"
pause
