@echo off
title SAAMX Live Floor Drill Simulation
echo ========================================================
echo  SAAMX - Live Trading Floor Simulation Drill
echo ========================================================
echo.
echo Checking backend server connection at http://localhost:3000...
node scripts/simulate_live_event_drill.js
echo.
pause
