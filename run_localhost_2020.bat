@echo off
setlocal EnableDelayedExpansion
title Biomedical Equipment Management System - localhost:2020
cd /d "%~dp0"

echo ======================================================================
echo    BIOMEDICAL EQUIPMENT MAINTENANCE MANAGEMENT SYSTEM (CMMS)
echo                   http://localhost:2020
echo ======================================================================
echo.

:: 1. Check PHP
where php >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] PHP is not found in your system PATH!
    echo Please install PHP or ensure it is added to your Environment Variables.
    echo.
    pause
    exit /b 1
)

:: 2. Check Node & npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not found in your system PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 3. Check MySQL service status
sc query mysql8 | findstr /i "RUNNING" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    sc query mysql | findstr /i "RUNNING" >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [NOTICE] MySQL service might not be running.
        echo If database queries fail, ensure MySQL is started.
        echo.
    )
)

:: 4. Free up ports 8000 and 2020 if already running from a previous session
echo [*] Checking and preparing network ports (8000 ^& 2020)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    if "%%a" neq "0" taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":2020 " ^| findstr "LISTENING"') do (
    if "%%a" neq "0" taskkill /f /pid %%a >nul 2>&1
)

:: 5. Start PHP Backend API on Port 8000 (minimized window)
echo [*] Starting PHP Backend API server on http://127.0.0.1:8000...
start "Biomedical Backend API (Port 8000)" /min cmd /c "php -S 127.0.0.1:8000 -t backend"

:: 6. Wait 2 seconds for PHP backend to initialize
ping -n 3 127.0.0.1 >nul 2>&1

:: 7. Launch default browser to http://localhost:2020
echo [*] Launching http://localhost:2020 in your default browser...
start http://localhost:2020

:: 8. Start Vite Frontend Server on Port 2020
echo [*] Starting Frontend Server on http://localhost:2020...
echo.
echo ======================================================================
echo  [+] Biomedical CMMS is now LIVE at http://localhost:2020
echo  [+] Backend API is running on http://127.0.0.1:8000
echo.
echo  Press Ctrl+C to stop both Frontend and Backend servers.
echo ======================================================================
echo.

cd frontend
call npm run dev

:: 9. Cleanup on exit
echo.
echo [*] Stopping background PHP backend server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    if "%%a" neq "0" taskkill /f /pid %%a >nul 2>&1
)
echo [*] All servers stopped. Thank you!
ping -n 3 127.0.0.1 >nul 2>&1
