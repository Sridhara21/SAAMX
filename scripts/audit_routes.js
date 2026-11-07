import fs from 'fs';

const serverCode = fs.readFileSync('server.js', 'utf8');
const lines = serverCode.split('\n');

const routeMap = new Map();
lines.forEach((line, idx) => {
  const match = line.match(/app\.(get|post|put|delete|patch|all)\(\s*(\[[^\]]+\]|'[^']+'|"[^"]+")/);
  if (match) {
    const method = match[1].toUpperCase();
    let paths = [];
    if (match[2].startsWith('[')) {
      paths = match[2].slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      paths = [match[2].replace(/^['"]|['"]$/g, '')];
    }
    paths.forEach(p => {
      const route = method + ' ' + p;
      if (!routeMap.has(route)) routeMap.set(route, []);
      routeMap.get(route).push(idx + 1);
    });
  }
});

console.log('Total unique route signatures found:', routeMap.size);
console.log('\n--- DUPLICATE ROUTES ---');
let dupCount = 0;
for (const [route, locs] of routeMap.entries()) {
  if (locs.length > 1) {
    dupCount++;
    console.log(`${route} -> defined ${locs.length} times at lines: ${locs.join(', ')}`);
  }
}
if (dupCount === 0) {
  console.log('Zero duplicate routes found!');
}


