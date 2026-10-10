console.log('Testing SAAMX 2026 Sentiment Polling Engine...');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Mock Poll State
const poll = {
  id: 'POLL_TEST_01',
  question: 'Is the Technology Sector currently overvalued?',
  options: [
    { id: 0, text: 'Yes, heavily overvalued (Bearish)', votes: 0 },
    { id: 1, text: 'No, AI justify multiples (Bullish)', votes: 0 },
    { id: 2, text: 'Neutral / Valuation fair', votes: 0 }
  ],
  status: 'OPEN',
  votes: {}
};

function vote(teamCode, optionId) {
  if (poll.status !== 'OPEN') return false;
  if (poll.votes[teamCode] !== undefined) return false; // Duplicate vote rejected
  poll.votes[teamCode] = optionId;
  poll.options[optionId].votes += 1;
  return true;
}

// Test 1: Cast valid votes from teams
assert(vote('T01', 1) === true, 'Team T01 voted Option 1 (Bullish)');
assert(vote('T02', 0) === true, 'Team T02 voted Option 0 (Bearish)');
assert(vote('T03', 1) === true, 'Team T03 voted Option 1 (Bullish)');

// Test 2: Reject duplicate vote from same team
assert(vote('T01', 0) === false, 'Duplicate vote from T01 rejected');

// Test 3: Validate vote tally percentages
const totalVotes = Object.keys(poll.votes).length;
const opt1Pct = Math.round((poll.options[1].votes / totalVotes) * 100);
const opt0Pct = Math.round((poll.options[0].votes / totalVotes) * 100);

assert(totalVotes === 3, `Total votes cast is 3 (Actual: ${totalVotes})`);
assert(opt1Pct === 67, `Option 1 percentage is 67% (Actual: ${opt1Pct}%)`);
assert(opt0Pct === 33, `Option 0 percentage is 33% (Actual: ${opt0Pct}%)`);

// Test 4: Poll closure
poll.status = 'CLOSED';
assert(vote('T04', 1) === false, 'Vote rejected on CLOSED poll');

console.log(`\nSentiment Polling Engine Test Summary: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
