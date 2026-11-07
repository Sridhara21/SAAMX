import fs from 'fs';
import path from 'path';

const uiDir = path.resolve('src/components/ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

console.log('--- Checking for circular dependencies in src/components/ui ---');

// Build dependency graph
const graph = {};
for (const file of files) {
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  graph[file] = [];

  // Match import statements: import ... from './...' or export ... from './...'
  const importRegex = /(?:import|export)\s+.*?from\s+['"]\.\/([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    let importedFile = match[1];
    if (!importedFile.endsWith('.js') && !importedFile.endsWith('.jsx') && !importedFile.endsWith('.css')) {
      if (fs.existsSync(path.join(uiDir, importedFile + '.jsx'))) {
        importedFile += '.jsx';
      } else if (fs.existsSync(path.join(uiDir, importedFile + '.js'))) {
        importedFile += '.js';
      }
    }
    if (importedFile.endsWith('.js') || importedFile.endsWith('.jsx')) {
      graph[file].push(importedFile);
    }
  }
}

console.log('Dependency graph:', JSON.stringify(graph, null, 2));

// Cycle detection using DFS
function findCycles(graph) {
  const visited = {};
  const recStack = {};
  const cycles = [];

  function dfs(node, path) {
    visited[node] = true;
    recStack[node] = true;

    for (const neighbor of graph[node] || []) {
      if (!visited[neighbor]) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recStack[neighbor]) {
        cycles.push([...path, neighbor]);
      }
    }

    recStack[node] = false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited[node]) {
      dfs(node, [node]);
    }
  }

  return cycles;
}

const cycles = findCycles(graph);
if (cycles.length > 0) {
  console.error('FAIL: Found circular dependencies:', cycles);
  process.exit(1);
} else {
  console.log('✓ SUCCESS: Zero circular dependencies found among UI primitives!');
  process.exit(0);
}
