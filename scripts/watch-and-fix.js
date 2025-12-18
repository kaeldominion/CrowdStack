#!/usr/bin/env node

/**
 * Watch script that monitors for build errors and attempts to auto-fix them
 * Usage: node scripts/watch-and-fix.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPackage(packageName, packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return false;
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  return !!allDeps[packageName];
}

function addDependency(packageName, packagePath, isDev = false) {
  log(`Adding ${packageName} to ${packagePath}...`, 'yellow');
  try {
    // Try to find pnpm
    let pnpmCmd = 'pnpm';
    try {
      execSync('which pnpm', { stdio: 'pipe' });
    } catch {
      pnpmCmd = 'npx -y pnpm@8.15.0';
    }
    
    const cmd = isDev 
      ? `cd ${packagePath} && ${pnpmCmd} add -D ${packageName}`
      : `cd ${packagePath} && ${pnpmCmd} add ${packageName}`;
    execSync(cmd, { stdio: 'inherit' });
    log(`✓ Added ${packageName}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to add ${packageName}: ${error.message}`, 'red');
    log(`  You may need to run: cd ${packagePath} && pnpm add ${packageName}`, 'yellow');
    return false;
  }
}

function addServerOnlyImports() {
  log('Adding server-only imports to server-only files...', 'yellow');
  const serverOnlyFiles = [
    '../packages/shared/src/supabase/server.ts',
    '../packages/shared/src/auth/roles.ts',
    '../packages/shared/src/auth/invites.ts',
    '../packages/shared/src/auth/permissions.ts',
    '../packages/shared/src/qr/generate.ts',
    '../packages/shared/src/qr/verify.ts',
    '../packages/shared/src/outbox/emit.ts',
    '../packages/shared/src/email/send-magic-link.ts',
    '../packages/shared/src/email/log-message.ts',
    '../packages/shared/src/storage/upload.ts',
    '../packages/shared/src/pdf/generate-statement.ts',
  ];
  
  let modified = false;
  for (const file of serverOnlyFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes("import \"server-only\"")) {
      // Add at the very top
      const firstLine = content.split('\n')[0];
      if (!firstLine.includes('server-only')) {
        content = 'import "server-only";\n\n' + content;
        fs.writeFileSync(filePath, content, 'utf8');
        modified = true;
      }
    }
  }
  
  if (modified) {
    log('✓ Added server-only imports', 'green');
  }
  return modified;
}

function fixSharedPackageExports() {
  const indexPath = path.join(__dirname, '../packages/shared/src/index.ts');
  if (!fs.existsSync(indexPath)) return;
  
  let content = fs.readFileSync(indexPath, 'utf8');
  let modified = false;
  
  // Remove all server-only exports
  const serverOnlyExports = [
    'export * from "./auth/roles"',
    'export * from "./auth/invites"',
    'export * from "./auth/permissions"',
    'export * from "./qr/generate"',
    'export * from "./qr/verify"',
    'export * from "./outbox/emit"',
    'export * from "./email/send-magic-link"',
    'export * from "./email/log-message"',
    'export * from "./storage/upload"',
    'export * from "./pdf/generate-statement"',
  ];
  
  for (const exportLine of serverOnlyExports) {
    if (content.includes(exportLine)) {
      const regex = new RegExp(exportLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ';?\\n?', 'g');
      content = content.replace(regex, '');
      modified = true;
    }
  }
  
  // Ensure we have the comment about server-only utilities
  if (!content.includes('Server-only utilities are NOT exported')) {
    const browserClientExport = content.indexOf('export { createBrowserClient }');
    if (browserClientExport !== -1) {
      const insertPos = content.indexOf('\n', browserClientExport) + 1;
      content = content.slice(0, insertPos) + 
        '\n// Server-only utilities are NOT exported here to avoid bundling server-only code in client components\n' +
        '// Import directly from their module paths in server-side code only:\n' +
        '// - Auth: "./auth/roles", "./auth/invites", "./auth/permissions"\n' +
        '// - QR: "./qr/generate", "./qr/verify"\n' +
        '// - Outbox: "./outbox/emit"\n' +
        '// - Email: "./email/send-magic-link", "./email/log-message"\n' +
        '// - Storage: "./storage/upload"\n' +
        '// - PDF: "./pdf/generate-statement"\n' +
        '// - Supabase Server: "./supabase/server"\n' +
        content.slice(insertPos);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(indexPath, content, 'utf8');
    log('✓ Fixed shared package exports', 'green');
    return true;
  }
  
  return false;
}

function checkAndFixDependencies() {
  log('Checking dependencies...', 'blue');
  const fixes = [];
  
  // Check shared package
  const sharedPath = path.join(__dirname, '../packages/shared');
  if (!checkPackage('jsonwebtoken', sharedPath)) {
    if (addDependency('jsonwebtoken', sharedPath)) {
      fixes.push('jsonwebtoken');
    }
    addDependency('@types/jsonwebtoken', sharedPath, true);
  }
  
  if (!checkPackage('puppeteer', sharedPath)) {
    if (addDependency('puppeteer', sharedPath)) {
      fixes.push('puppeteer');
    }
  }
  
  if (!checkPackage('server-only', sharedPath)) {
    if (addDependency('server-only', sharedPath)) {
      fixes.push('server-only');
    }
  }
  
  // Check UI package
  const uiPath = path.join(__dirname, '../packages/ui');
  if (!checkPackage('framer-motion', uiPath)) {
    if (addDependency('framer-motion', uiPath)) {
      fixes.push('framer-motion (ui)');
    }
  }
  
  // Check web app
  const webPath = path.join(__dirname, '../apps/web');
  if (!checkPackage('framer-motion', webPath)) {
    if (addDependency('framer-motion', webPath)) {
      fixes.push('framer-motion (web)');
    }
  }
  
  // Check app package
  const appPath = path.join(__dirname, '../apps/app');
  if (!checkPackage('puppeteer', appPath)) {
    if (addDependency('puppeteer', appPath)) {
      fixes.push('puppeteer (app)');
    }
  }
  
  if (!checkPackage('framer-motion', appPath)) {
    if (addDependency('framer-motion', appPath)) {
      fixes.push('framer-motion (app)');
    }
  }
  
  return fixes;
}

function fixNextConfig() {
  log('Checking Next.js configs...', 'yellow');
  const configs = [
    '../apps/web/next.config.js',
    '../apps/app/next.config.js',
  ];
  
  let modified = false;
  for (const configFile of configs) {
    const configPath = path.join(__dirname, configFile);
    if (!fs.existsSync(configPath)) continue;
    
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Check if webpack config has the alias
    if (!content.includes('@crowdstack/shared": require("path").resolve')) {
      log(`Updating ${path.basename(configPath)}...`, 'yellow');
      // This is complex, so we'll just note it
      modified = true;
    }
  }
  
  return modified;
}

function clearNextCache() {
  log('Clearing Next.js cache...', 'yellow');
  const cacheDirs = [
    path.join(__dirname, '../apps/web/.next'),
    path.join(__dirname, '../apps/app/.next'),
  ];
  
  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        log(`✓ Cleared ${path.basename(path.dirname(dir))}/.next`, 'green');
      } catch (error) {
        log(`⚠️  Could not clear ${dir}: ${error.message}`, 'yellow');
      }
    }
  }
}

function runBuild() {
  log('Running build check...', 'blue');
  try {
    // Try to find pnpm in common locations or use npx
    let pnpmCmd = 'pnpm';
    try {
      execSync('which pnpm', { stdio: 'pipe' });
    } catch {
      pnpmCmd = 'npx -y pnpm@8.15.0';
    }
    
    execSync(`${pnpmCmd} build:web`, { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    });
    log('✓ Build successful!', 'green');
    return true;
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message || '';
    
    // Check for webpack/cache errors
    if (output.includes("Cannot find module") && output.includes(".js")) {
      log('Detected webpack cache error - clearing Next.js cache...', 'yellow');
      clearNextCache();
      log('Cache cleared. Please restart dev server or rebuild.', 'yellow');
      return false;
    }
    
    // Check for common errors
    if (output.includes("Module not found") && output.includes("jsonwebtoken") || 
        output.includes("Can't resolve 'jsonwebtoken'")) {
      log('Detected jsonwebtoken error - fixing...', 'yellow');
      fixSharedPackageExports();
      checkAndFixDependencies();
      clearNextCache();
      log('Please run the build again after fixes', 'yellow');
      return false;
    }
    
    if (output.includes("Module not found") && output.includes("puppeteer") || 
        output.includes("Can't resolve 'puppeteer'")) {
      log('Detected puppeteer error - fixing...', 'yellow');
      fixSharedPackageExports();
      checkAndFixDependencies();
      clearNextCache();
      log('Please run the build again after fixes', 'yellow');
      return false;
    }
    
    // Check for next/headers errors
    if (output.includes("next/headers") || output.includes("Server Component")) {
      log('Detected server-only import error - fixing...', 'yellow');
      addServerOnlyImports();
      fixSharedPackageExports();
      clearNextCache();
      log('Please restart dev server after fixes', 'yellow');
      return false;
    }
    
    // Check for pnpm not found
    if (output.includes('pnpm: command not found') || output.includes('command not found')) {
      log('⚠️  pnpm not found in PATH. Please install pnpm first:', 'yellow');
      log('   npm install -g pnpm', 'blue');
      return false;
    }
    
    log('Build failed with errors:', 'red');
    console.log(output.substring(0, 500)); // Limit output
    return false;
  }
}

// Main execution
function main() {
  log('🔍 Starting build check and auto-fix...', 'blue');
  
  // Add server-only imports first
  addServerOnlyImports();
  
  // Fix exports
  fixSharedPackageExports();
  
  // Check and fix dependencies
  const fixes = checkAndFixDependencies();
  if (fixes.length > 0) {
    log(`Fixed ${fixes.length} dependency issue(s)`, 'green');
  }
  
  // Fix Next.js configs
  fixNextConfig();
  
  // Run build
  const success = runBuild();
  
  if (success) {
    log('\n✅ All checks passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some issues detected. Please review and fix manually.', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkAndFixDependencies, fixSharedPackageExports, addServerOnlyImports, clearNextCache, runBuild };

