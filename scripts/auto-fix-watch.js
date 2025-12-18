#!/usr/bin/env node

/**
 * Watch script that automatically runs check-fix after file changes
 * Usage: node scripts/auto-fix-watch.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { checkAndFixDependencies, fixSharedPackageExports, addServerOnlyImports, clearNextCache, runBuild } = require('./watch-and-fix');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkLocalhost() {
  try {
    const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3006', { encoding: 'utf8' });
    return response.trim() === '200';
  } catch {
    return false;
  }
}

function runAutoFix() {
  log('\n🔄 Auto-fixing after file change...', 'cyan');
  
  try {
    // Run all fixes
    addServerOnlyImports();
    fixSharedPackageExports();
    checkAndFixDependencies();
    clearNextCache();
    
    // Check localhost
    log('Checking localhost:3006...', 'blue');
    if (checkLocalhost()) {
      log('✓ localhost:3006 is responding', 'green');
    } else {
      log('⚠️  localhost:3006 not responding (dev server may need restart)', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`✗ Auto-fix error: ${error.message}`, 'red');
    return false;
  }
}

// Watch for file changes
const watchPaths = [
  path.join(__dirname, '../packages/shared/src'),
  path.join(__dirname, '../apps/web/src'),
  path.join(__dirname, '../apps/app/src'),
];

log('👀 Watching for file changes...', 'blue');
log('Press Ctrl+C to stop', 'yellow');

// Initial run
runAutoFix();

// Simple polling-based watch (since chokidar might not be available)
let lastCheck = Date.now();
const POLL_INTERVAL = 2000; // Check every 2 seconds

const interval = setInterval(() => {
  let changed = false;
  
  for (const watchPath of watchPaths) {
    if (!fs.existsSync(watchPath)) continue;
    
    try {
      const stats = fs.statSync(watchPath);
      if (stats.mtimeMs > lastCheck) {
        changed = true;
        break;
      }
      
      // Check files recursively (simplified - just check a few key files)
      const keyFiles = [
        path.join(watchPath, 'index.ts'),
        path.join(watchPath, 'index.tsx'),
      ];
      
      for (const file of keyFiles) {
        if (fs.existsSync(file)) {
          const fileStats = fs.statSync(file);
          if (fileStats.mtimeMs > lastCheck) {
            changed = true;
            break;
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  if (changed) {
    lastCheck = Date.now();
    runAutoFix();
  }
}, POLL_INTERVAL);

// Handle exit
process.on('SIGINT', () => {
  log('\n\n👋 Stopping watch...', 'yellow');
  clearInterval(interval);
  process.exit(0);
});

