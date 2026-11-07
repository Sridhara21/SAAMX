import fs from 'fs';

const state = JSON.parse(fs.readFileSync('state.json', 'utf8'));
const dtai = state.securities.find(s => s.ticker === 'DTAI');
console.log('DTAI in state.json:', dtai ? { id: dtai.id, ticker: dtai.ticker, name: dtai.name, price: dtai.currentPrice } : 'NOT FOUND');

const reli = state.securities.find(s => s.ticker === 'RELI' || s.ticker === 'RELIANCE');
console.log('Reliance in state.json:', reli ? { id: reli.id, ticker: reli.ticker, name: reli.name } : 'NOT FOUND');

console.log('Total securities in state.json:', state.securities.length);
