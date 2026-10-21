@echo off
title Stop Biomedical Equipment CMMS
cd /d "%~dp0"

echo ======================================================================
echo    STOPPING BIOMEDICAL CMMS SERVERS (Ports 8000 ^& 2020)
echo ======================================================================
echo.

echo [*] Terminating processes on Port 8000 (PHP Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    if "%%a" neq "0" (
        taskkill /f /pid %%a >nul 2>&1
        echo     - Stopped PID %%a
    )
)

echo [*] Terminating processes on Port 2020 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":2020 " ^| findstr "LISTENING"') do (
    if "%%a" neq "0" (
        taskkill /f /pid %%a >nul 2>&1
        echo     - Stopped PID %%a
    )
)

echo.
echo [*] All servers on Port 8000 and 2020 have been stopped.
echo.
ping -n 3 127.0.0.1 >nul 2>&1
