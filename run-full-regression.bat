@echo off
title SAAMX Full Regression Battery
echo ========================================================
echo  Running SAAMX Master Verification Battery (18 Suites)
echo ========================================================
echo.
echo Checking baseline hash of state.json...
node -e "const crypto=require('crypto'),fs=require('fs'),h=crypto.createHash('sha256').update(fs.readFileSync('state.json')).digest('hex'),exp='6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';console.log('Baseline Hash Match:', h===exp ? 'OK' : 'FAIL');"

echo.
echo [1/18] Running Milestone M0 (Security & Defects)...
node test-milestone-m0-defects.js

echo.
echo [2/18] Running Milestone M1 (Order Lifecycle & 2-Phase Settlement)...
node test-milestone-m1-order-lifecycle.js

echo.
echo [3/18] Running Milestone M2 (Finite FX Reserves)...
node test-milestone-m2-fx-reserves.js

echo.
echo [4/18] Running Milestone M3 (Durable Accounting & IPO)...
node test-milestone-m3-accounting.js

echo.
echo [5/18] Running Milestone M1 (News Intelligence & 400 Presets)...
node test-milestone-m1-news-intelligence.js

echo.
echo [6/18] Running Phase C (Dedicated Desk Queues)...
node test-milestone-phase-c-queues.js

echo.
echo [7/18] Running Phase C (Mutex Concurrency Stress)...
node test-adversarial-phase-c-concurrency.js

echo.
echo [8/18] Running Phase D (FX Operator Processing Queue)...
node test-milestone-phase-d-fx-queue.js

echo.
echo [9/18] Running Phase D (Scarcity & Reserve Stress)...
node test-phase-d-challenger-2-stress.js

echo.
echo [10/18] Running Phase D (Adversarial FX Queue)...
node test-adversarial-phase-d-fx-queue.js

echo.
echo [11/18] Running Phase E (Broker Advisory Terminal)...
node test-milestone-phase-e-broker.js

echo.
echo [12/18] Running Phase E (Valuation & Ratio Boundaries)...
node test-adversarial-phase-e-ratios.js

echo.
echo [13/18] Running Phase E (Advisory Non-Execution)...
node test-adversarial-phase-e-concurrency.js

echo.
echo [14/18] Running Phase F (Training Sandbox Workflows)...
node test-milestone-phase-f-training.js

echo.
echo [15/18] Running Phase F (Sandbox Zero-Leakage Stress)...
node test-adversarial-phase-f-isolation.js

echo.
echo [16/18] Running Phase F (Operator Performance Scorecards)...
node test-adversarial-phase-f-scorecards.js

echo.
echo [17/18] Running Master Opaque-Box E2E Battery (Tiers 1-4)...
node test-e2e-master-runner.js

echo.
echo [18/18] Testing Vite Production Build Compilation...
cmd /c npm run build

echo.
echo Re-checking post-test baseline hash of state.json...
node -e "const crypto=require('crypto'),fs=require('fs'),h=crypto.createHash('sha256').update(fs.readFileSync('state.json')).digest('hex'),exp='6c30e425ca30e0a22a5be40c7228543d1e8d716fe9a4795b3cdf136df728acca';console.log('Post-test Baseline Hash Match:', h===exp ? 'OK (Bit-Exact)' : 'FAIL');"

echo.
echo ========================================================
echo  All 18 Suites Completed!
echo ========================================================
pause
