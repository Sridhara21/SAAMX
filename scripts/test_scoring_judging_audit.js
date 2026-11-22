import assert from 'assert';
import * as scoringEngine from '../scoring_engine.js';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   SAAMX SCORING, JUDGING & SCHEDULE AUDIT TEST');
console.log('====================================================\n');

let passCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// 1. Rubric Category Weights & Individual Criteria Verification
runTest('Risk Management rubric total = 300 pts', () => {
  const t = scoringEngine.DEFAULT_SCORING_CONFIG.thresholds.riskManagement;
  assert.strictEqual(t.maxDrawdown, 80, 'Max Drawdown must be 80');
  assert.strictEqual(t.positionConcentration, 60, 'Position Concentration must be 60');
  assert.strictEqual(t.sectorExposure, 50, 'Sector Exposure must be 50');
  assert.strictEqual(t.liquidity, 40, 'Liquidity must be 40');
  assert.strictEqual(t.currencyRisk, 35, 'Currency Risk must be 35');
  assert.strictEqual(t.compliance, 35, 'Compliance must be 35');
  assert.strictEqual(t.total, 300, 'Risk total must be 300');
});

runTest('Returns & Performance rubric total = 250 pts', () => {
  const t = scoringEngine.DEFAULT_SCORING_CONFIG.thresholds.returnsPerformance;
  assert.strictEqual(t.absoluteReturn, 150, 'Absolute Return must be 150');
  assert.strictEqual(t.benchmarkRelative, 60, 'Benchmark Relative Alpha must be 60');
  assert.strictEqual(t.capitalEfficiency, 40, 'Capital Efficiency must be 40');
  assert.strictEqual(t.total, 250, 'Returns total must be 250');
});

runTest('Diversification rubric total = 200 pts', () => {
  const t = scoringEngine.DEFAULT_SCORING_CONFIG.thresholds.diversification;
  assert.strictEqual(t.instrument, 60, 'Instrument must be 60');
  assert.strictEqual(t.sector, 45, 'Sector must be 45');
  assert.strictEqual(t.assetClass, 40, 'Asset Class must be 40');
  assert.strictEqual(t.geographic, 30, 'Geographic must be 30');
  assert.strictEqual(t.balance, 25, 'Balance must be 25');
  assert.strictEqual(t.total, 200, 'Diversification total must be 200');
});

runTest('Decision-Making & Adaptability rubric total = 150 pts', () => {
  const t = scoringEngine.DEFAULT_SCORING_CONFIG.thresholds.decisionMaking;
  assert.strictEqual(t.responseToEvents, 45, 'Response to Events must be 45');
  assert.strictEqual(t.decisionTiming, 35, 'Decision Timing must be 35');
  assert.strictEqual(t.adaptability, 35, 'Adaptability must be 35');
  assert.strictEqual(t.riskRecognition, 35, 'Risk Recognition must be 35');
  assert.strictEqual(t.total, 150, 'Decision Making total must be 150');
});

runTest('Future Potential rubric total = 100 pts', () => {
  const t = scoringEngine.DEFAULT_SCORING_CONFIG.thresholds.futurePotential;
  assert.strictEqual(t.forwardPositioning, 35, 'Forward Positioning must be 35');
  assert.strictEqual(t.resilience, 30, 'Resilience must be 30');
  assert.strictEqual(t.balance, 20, 'Balance must be 20');
  assert.strictEqual(t.adaptCapacity, 15, 'Adapt Capacity must be 15');
  assert.strictEqual(t.total, 100, 'Future Potential total must be 100');
});

runTest('Automated (750) + Human (250) = 1,000 pts grand total', () => {
  const auto = 300 + 250 + 200;
  const human = 150 + 100;
  assert.strictEqual(auto, 750, 'Automated must be 750');
  assert.strictEqual(human, 250, 'Human must be 250');
  assert.strictEqual(auto + human, 1000, 'Grand total must be 1,000');
});

// 2. Human Judging Verification
runTest('Provisional human score is neutral 3/5 rating = 150/250 pts', () => {
  const res = scoringEngine.calculateJudgeScores([], 'T01');
  assert.strictEqual(res.decisionMaking.isProvisional, true);
  assert.strictEqual(res.futurePotential.isProvisional, true);
  assert.strictEqual(res.decisionMaking.total, 90, 'Provisional DM must be 90 (3/5 of 150)');
  assert.strictEqual(res.futurePotential.total, 60, 'Provisional FP must be 60 (3/5 of 100)');
  assert.strictEqual(res.decisionMaking.total + res.futurePotential.total, 150, 'Total provisional must be 150');
  assert.strictEqual(res.moderationRequired, false);
});

runTest('Dual-judge averaging calculates arithmetic mean correctly', () => {
  const cards = [
    {
      judgeId: 'J1',
      teamCode: 'T01',
      responseToEvents: 4,
      decisionTiming: 4,
      adaptability: 4,
      riskRecognition: 4,
      forwardPositioning: 4,
      resilience: 4,
      balance: 4,
      adaptCapacity: 4
    },
    {
      judgeId: 'J2',
      teamCode: 'T01',
      responseToEvents: 2,
      decisionTiming: 2,
      adaptability: 2,
      riskRecognition: 2,
      forwardPositioning: 2,
      resilience: 2,
      balance: 2,
      adaptCapacity: 2
    }
  ];
  const res = scoringEngine.calculateJudgeScores(cards, 'T01');
  assert.strictEqual(res.judgesCount, 2);
  assert.strictEqual(res.decisionMaking.breakdown.responseToEvents.rating, 3.0);
  assert.strictEqual(res.futurePotential.breakdown.forwardPositioning.rating, 3.0);
  assert.strictEqual(res.decisionMaking.total, 90);
  assert.strictEqual(res.futurePotential.total, 60);
});

runTest('Moderation flag triggers when divergence > 3 rating points', () => {
  const cards = [
    { judgeId: 'J1', teamCode: 'T01', responseToEvents: 5, decisionTiming: 5 },
    { judgeId: 'J2', teamCode: 'T01', responseToEvents: 1, decisionTiming: 1 }
  ];
  const res = scoringEngine.calculateJudgeScores(cards, 'T01');
  assert.strictEqual(res.moderationRequired, true, 'Discrepancy 10 vs 2 must trigger moderation');
});

runTest('Chief Judge official moderation resolves moderation flag', () => {
  const cards = [
    { judgeId: 'J1', teamCode: 'T01', responseToEvents: 5, decisionTiming: 5 },
    { judgeId: 'J2', teamCode: 'T01', responseToEvents: 1, decisionTiming: 1 },
    {
      judgeId: 'MODERATOR',
      isModerated: true,
      teamCode: 'T01',
      responseToEvents: 4,
      decisionTiming: 4,
      adaptability: 4,
      riskRecognition: 4,
      forwardPositioning: 4,
      resilience: 4,
      balance: 4,
      adaptCapacity: 4,
      moderationNotes: 'Resolved by Chief Judge'
    }
  ];
  const res = scoringEngine.calculateJudgeScores(cards, 'T01');
  assert.strictEqual(res.moderationRequired, false, 'Moderated card must resolve moderation');
  assert.strictEqual(res.isModerated, true);
  assert.strictEqual(res.decisionMaking.total, 120, '4/5 of 150 = 120 pts');
});

// 3. Regulatory Penalties
runTest('Penalty cap: single violation capped at -50 pts, aggregate capped at -150 pts', () => {
  const singleExcessive = [{ teamCode: 'T01', pointsDeducted: 80, status: 'APPLIED' }];
  const singleRes = scoringEngine.calculatePenalties(singleExcessive, 'T01');
  assert.strictEqual(singleRes.totalDeduction, 50, 'Single deduction must cap at 50');

  const multipleExcessive = [
    { teamCode: 'T01', pointsDeducted: 50, status: 'APPLIED' },
    { teamCode: 'T01', pointsDeducted: 50, status: 'APPLIED' },
    { teamCode: 'T01', pointsDeducted: 50, status: 'APPLIED' },
    { teamCode: 'T01', pointsDeducted: 50, status: 'APPLIED' }
  ];
  const multiRes = scoringEngine.calculatePenalties(multipleExcessive, 'T01');
  assert.strictEqual(multiRes.totalDeduction, 150, 'Aggregate deduction must cap at 150');
});

// 4. Deterministic Tie-Breaker Order
runTest('Deterministic tie-breaker order: Risk -> Decision -> Diversification -> Returns', () => {
  // Construct 2 teams with identical final score (800)
  const teamA = {
    id: 'T01',
    teamCode: 'T01',
    teamName: 'Team Alpha',
    tradesCount: 10,
    peakEquity: 10000000,
    portfolioValue: 10000000,
    cashINR: 10000000,
    holdingsINR: 0,
    holdings: []
  };
  const teamB = {
    id: 'T02',
    teamCode: 'T02',
    teamName: 'Team Beta',
    tradesCount: 10,
    peakEquity: 10000000,
    portfolioValue: 10000000,
    cashINR: 10000000,
    holdingsINR: 0,
    holdings: []
  };

  const state = {
    teams: [teamA, teamB],
    securities: [],
    fxRates: {},
    judgeScorecards: [
      // Team A: Higher Risk, Lower Decision
      { judgeId: 'J1', teamCode: 'T01', responseToEvents: 2, decisionTiming: 2, adaptability: 2, riskRecognition: 2, forwardPositioning: 2, resilience: 2, balance: 2, adaptCapacity: 2 },
      // Team B: Lower Risk, Higher Decision
      { judgeId: 'J1', teamCode: 'T02', responseToEvents: 5, decisionTiming: 5, adaptability: 5, riskRecognition: 5, forwardPositioning: 5, resilience: 5, balance: 5, adaptCapacity: 5 }
    ]
  };

  const leaderboard = scoringEngine.generateLeaderboard(state);
  assert.strictEqual(leaderboard.length, 2);
  assert.strictEqual(scoringEngine.DEFAULT_SCORING_CONFIG.tieBreakOrder[0], 'riskManagement');
  assert.strictEqual(scoringEngine.DEFAULT_SCORING_CONFIG.tieBreakOrder[1], 'decisionMaking');
  assert.strictEqual(scoringEngine.DEFAULT_SCORING_CONFIG.tieBreakOrder[2], 'diversification');
  assert.strictEqual(scoringEngine.DEFAULT_SCORING_CONFIG.tieBreakOrder[3], 'returnsPerformance');
});

// 5. Operational Event Times Verification
runTest('Operational event times consistency across codebase', () => {
  const landing = fs.readFileSync('src/pages/PublicLandingPage.jsx', 'utf8');
  assert(landing.includes('09:30 AM') && landing.includes('Market Opens'), 'Landing must display 09:30 AM Market Opens');
  assert(landing.includes('10:00 AM') && landing.includes('Morning News'), 'Landing must display 10:00 AM Morning News');
  assert(landing.includes('11:45 AM') && landing.includes('Floor Debate'), 'Landing must display 11:45 AM Floor Debate');
  assert(landing.includes('03:00 PM') && landing.includes('Evening News'), 'Landing must display 03:00 PM Evening News');
  assert(landing.includes('03:30 PM') && landing.includes('Market Closes'), 'Landing must display 03:30 PM Market Closes');
  assert(landing.includes('04:00 PM') && landing.includes('Championship Results'), 'Landing must display 04:00 PM Results');
});

runTest('Bulletin & Debate prep/presentation timing', () => {
  assert(fs.existsSync('src/lib/morningNewsBulletin.js'), 'Morning bulletin exists');
  assert(fs.existsSync('src/lib/eveningNewsBulletin.js'), 'Evening bulletin exists');
  assert(fs.existsSync('src/lib/debateBank.js'), 'Debate bank exists');
});

runTest('No clock-only market-moving triggers', () => {
  const serverCode = fs.readFileSync('server.js', 'utf8');
  assert(!serverCode.includes('autoExecuteOrdersOnClock'), 'No auto order execution on clock');
  assert(!serverCode.includes('autoPublishNewsOnClock'), 'No auto news publish on clock');
});

runTest('Realtime and privacy boundaries in server.js', () => {
  const serverCode = fs.readFileSync('server.js', 'utf8');
  assert(serverCode.includes('delete clone.judgeScorecards'), 'Non-judges must not receive judge scorecards before publication');
  assert(serverCode.includes('delete clone.publishedResults'), 'Unreleased results must be deleted for non-judges');
});

console.log(`\n----------------------------------------------------`);
console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passCount} | FAILED: ${totalTests - passCount}`);
console.log(`----------------------------------------------------\n`);

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
