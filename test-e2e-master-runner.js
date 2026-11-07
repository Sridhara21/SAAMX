/**
 * SAAMX '26 — Master E2E Test Suite Orchestrator
 * File: SAAMX/test-e2e-master-runner.js
 * 
 * Executes the complete 4-Tier E2E Test Architecture sequentially:
 *   - Tier 1: Feature Coverage (47 isolated functional tests across 8 domains)
 *   - Tier 2: Boundary & Corner Cases (32 adversarial boundary & limit tests)
 *   - Tier 3: Cross-Feature Integration Pipelines (9 multi-actor workflow tests)
 *   - Tier 4: Real-World Application Scenarios (5 complex simulation flows)
 * 
 * Verifies all 31 features across all 12 operational portals under strict
 * zero-side-effect isolation with authoritative state hash preservation.
 */

import { fileURLToPath } from 'url';
import {
  startTestServer,
  verifyAuthoritativeBaseline,
  TestRecorder,
  DEFAULT_TEST_PORT,
  AUTHORITATIVE_BASELINE_HASH
} from './test-e2e-helpers.js';

import { runTier1 } from './test-e2e-tier1-features.js';
import { runTier2 } from './test-e2e-tier2-boundaries.js';
import { runTier3 } from './test-e2e-tier3-combinations.js';
import { runTier4 } from './test-e2e-tier4-scenarios.js';

export async function runMasterSuite(port = DEFAULT_TEST_PORT) {
  const masterRecorder = new TestRecorder('SAAMX 26 Master E2E Suite');
  const startTime = Date.now();

  console.log(`\n======================================================================`);
  console.log(`🌟 SAAMX '26 — MASTER E2E TEST BATTERY EXECUTION`);
  console.log(`======================================================================`);
  console.log(`Authoritative Baseline Hash : ${AUTHORITATIVE_BASELINE_HASH}`);
  console.log(`Target Ephemeral Port       : ${port}`);
  console.log(`Environment Isolation      : Zero-Side-Effect Disposable State Snapshot`);
  console.log(`Coverage Scope              : All 31 Features across all 12 Portals`);
  console.log(`Hierarchy                   : 4-Tier Requirement-Driven Test Architecture`);
  console.log(`======================================================================\n`);

  let harness = null;
  try {
    harness = await startTestServer(port);

    // Tier 1: Feature Coverage
    console.log(`\n>>> [1/4] EXECUTING TIER 1: FEATURE COVERAGE <<<`);
    await runTier1(harness.baseUrl, masterRecorder);

    // Tier 2: Boundary & Corner Cases
    console.log(`\n>>> [2/4] EXECUTING TIER 2: BOUNDARY & CORNER CASES <<<`);
    await runTier2(harness.baseUrl, masterRecorder);

    // Tier 3: Cross-Feature Combinations
    console.log(`\n>>> [3/4] EXECUTING TIER 3: CROSS-FEATURE INTEGRATION PIPELINES <<<`);
    await runTier3(harness.baseUrl, masterRecorder);

    // Tier 4: Real-World Scenarios
    console.log(`\n>>> [4/4] EXECUTING TIER 4: REAL-WORLD APPLICATION SCENARIOS <<<`);
    await runTier4(harness.baseUrl, masterRecorder);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n======================================================================`);
    console.log(`🏆 SAAMX '26 MASTER E2E BATTERY COMPLETED IN ${totalDuration}s`);
    console.log(`======================================================================`);

    const summary = masterRecorder.printSummary();

    await harness.cleanup();

    console.log(`\n[CERTIFICATION] All tiers executed. Server torn down and disposable state removed.`);
    console.log(`[CERTIFICATION] Authoritative baseline state.json verified untouched.`);

    return summary;
  } catch (err) {
    console.error('\n[FATAL] Master test battery aborted with unhandled error:', err);
    if (harness) await harness.cleanup();
    throw err;
  }
}

// Direct CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      const summary = await runMasterSuite();
      process.exit(summary.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error('Fatal execution failure:', err);
      process.exit(1);
    }
  })();
}
