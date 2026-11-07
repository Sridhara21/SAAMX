import fs from 'fs';
import path from 'path';

const appCode = fs.readFileSync('src/App.jsx', 'utf8');

// Find all route checks in App.jsx (e.g. route === '#/admin' or route.startsWith('#/team'))
const routeMatches = appCode.match(/(?:route\s*===|route\.startsWith)\s*\(['"]([^'"]+)['"]\)/g) || [];
console.log('Detected route conditions in App.jsx:', routeMatches);

// List all files in src/pages
const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
console.log(`\nFound ${files.length} pages in ${pagesDir}:`);

files.forEach(file => {
  const fullPath = path.join(pagesDir, file);
  const code = fs.readFileSync(fullPath, 'utf8');
  const lineCount = code.split('\n').length;
  
  // Look for exported component
  const compMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/) ||
                    code.match(/function\s+([A-Za-z0-9_]+)/);
  const compName = compMatch ? compMatch[1] : 'Unknown';

  // Look for buttons, inputs, forms
  const buttonCount = (code.match(/<button/g) || []).length;
  const inputCount = (code.match(/<input/g) || []).length;
  const formCount = (code.match(/<form/g) || []).length;
  const selectCount = (code.match(/<select/g) || []).length;

  // Look for api/fetch calls
  const apiCalls = (code.match(/apiFetch\([^)]+\)/g) || []).length +
                   (code.match(/fetch\([^)]+\)/g) || []).length;

  console.log(`- ${file} (${compName}): ${lineCount} lines | ${buttonCount} buttons | ${inputCount} inputs | ${selectCount} selects | ${apiCalls} api/fetch calls`);
});
