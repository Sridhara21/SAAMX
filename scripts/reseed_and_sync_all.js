import fs from 'fs';
import { generateFullSecurityUniverse } from '../universe_generator.js';

console.log('⚡ Reseeding state.json with pristine 2,061 universe and hidden IPOs...');

const securities = generateFullSecurityUniverse();
console.log(`Generated ${securities.length} securities.`);

let state = {};
try {
  if (fs.existsSync('./state.json')) {
    state = JSON.parse(fs.readFileSync('./state.json', 'utf8'));
  }
} catch (e) {
  console.log('Starting fresh state object.');
}

state.securities = securities;

// Verify simulated IPOs
const ipoTickers = ['OAI', 'STRP', 'CNVA', 'DISC', 'POLY'];
ipoTickers.forEach(ticker => {
  const ipo = state.securities.find(s => s.ticker === ticker);
  if (ipo) {
    console.log(`Verified IPO ${ticker}: status=${ipo.status}, ipoStage=${ipo.ipoStage}, visible=${ipo.visibleToParticipants}`);
  } else {
    console.error(`ERROR: IPO ${ticker} not found in generated universe!`);
  }
});

fs.writeFileSync('./state.json', JSON.stringify(state, null, 2), 'utf8');
console.log('✔ state.json successfully updated with 2,061 securities!');
