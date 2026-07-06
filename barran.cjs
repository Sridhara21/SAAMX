const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const wakaCli = path.join(os.homedir(), '.wakatime', 'wakatime-cli-windows-amd64.exe');
const projectPath = path.resolve(__dirname); 
const plugin = "vscode/1.85.0 vscode-wakatime/24.0.0";

// A recursive function to get all actual code files in a project
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo' && file !== 'venv' && file !== '__pycache__') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file);
      const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.md', '.json'];
      if (allowedExts.includes(ext)) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(projectPath);

console.log(`[BASHA WAKATIMER V2 - ADVANCED] Engine Initiated.`);
console.log(`- Detected ${allFiles.length} files in Basha workspace`);
console.log(`- Features Active: Deep Work Simulation, Semantic Typing, Natural Pauses`);
console.log(`Commencing realistic developer simulation...\\n`);

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendHeartbeat(file, isWrite, lineno, cursorpos) {
  const args = [
    '--entity', file,
    '--plugin', plugin,
    '--category', 'coding',
    '--lineno', lineno.toString(),
    '--cursorpos', cursorpos.toString()
  ];
  if (isWrite) {
    args.push('--write');
  }

  const child = spawn(wakaCli, args);
  child.on('error', (err) => { console.error(`[WAKA ERROR] ${err.message}`); });
  child.stderr.on('data', (data) => { console.error(`[WAKA CLI] ${data.toString()}`); });
  child.on('close', (code) => {
    if (code === 0) process.stdout.write(isWrite ? 'W' : '.'); 
    else process.stdout.write('X'); // X for failure
  });
}

function getDayTimeFactor() {
    const hour = new Date().getHours();
    // Simulate high productivity between 10am-12pm and 2pm-5pm
    if ((hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 17)) {
        return 1.5; // 50% faster
    }
    // Sleep time
    if (hour >= 2 && hour <= 7) {
        return 0.1; // 90% slower, occasional weird late-night burst
    }
    return 1.0;
}

function runSimulationLoop() {
  if (allFiles.length === 0) {
      console.log("No files found to simulate!");
      return;
  }
  
  const activeFile = allFiles[getRandomInt(0, allFiles.length - 1)];
  const ext = path.extname(activeFile);
  
  let lines = 100;
  try { lines = fs.readFileSync(activeFile, 'utf-8').split('\\n').length; } catch(e) {}
  
  let currentLine = getRandomInt(1, Math.max(1, lines));
  let cursor = getRandomInt(0, 50);

  // Dynamic burst sizes based on time of day
  const factor = getDayTimeFactor();
  const actionsInBurst = Math.floor(getRandomInt(3, 12) * factor);
  let actionsCompleted = 0;

  function doAction() {
    if (actionsCompleted >= actionsInBurst) {
      let delayToNextBurst = getRandomInt(10000, 30000); // 10 to 30 seconds

      // Types of breaks:
      const breakType = Math.random();
      if (breakType > 0.98) { // reduced probability
        delayToNextBurst = getRandomInt(10000, 20000); // 10-20 sec instead of mins
        console.log(`\\n[SIM] Quick pause...`);
      }

      setTimeout(runSimulationLoop, delayToNextBurst);
      return;
    }

    // Simulate typing: move cursor forward naturally
    currentLine += getRandomInt(0, 3); 
    cursor += getRandomInt(-5, 25);
    if (cursor < 0) cursor = 0;

    // We write less often than we scroll/read
    const isWrite = Math.random() > 0.7;
    sendHeartbeat(activeFile, isWrite, currentLine, cursor);

    actionsCompleted++;
    
    // Typing speed simulator (faster for python/js, slower for css)
    let typingSpeed = getRandomInt(500, 3000);
    if (ext === '.css' || ext === '.md') typingSpeed += 1000;
    
    setTimeout(doAction, typingSpeed);
  }

  doAction();
}

runSimulationLoop();
