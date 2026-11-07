@echo off
title SAAMX Development Environment
echo ========================================================
echo  Starting SAAMX - Student Academic Asset Market eXchange
echo ========================================================
echo.
echo Launching Backend Server on port 3000...
start "SAAMX Backend Server" cmd /k "npm run server"
timeout /t 2 /nobreak >nul

echo Launching Frontend Vite Server on port 5173...
start "SAAMX Frontend Client" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173/

echo.
echo SAAMX is running!
echo - Backend API: http://localhost:3000/
echo - Frontend Client: http://localhost:5173/
echo.
pause
