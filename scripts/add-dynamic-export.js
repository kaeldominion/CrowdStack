#!/usr/bin/env node

/**
 * Script to add `export const dynamic = 'force-dynamic';` to API routes that use cookies() or createClient()
 * This prevents Next.js from trying to statically generate routes that need to be dynamic
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.join(__dirname, '../apps/unified/src/app/api');

// Find all route.ts files that use cookies() or createClient() but don't have dynamic export
function findRoutesNeedingDynamic() {
  const routes = [];
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file === 'route.ts' || file === 'route.js') {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if route uses cookies() or createClient() directly
        // OR uses helper functions that internally use cookies (getUserId, getUserVenueId, etc.)
        // OR uses dynamic request properties (request.url, request.headers, etc.)
        const usesCookies = /cookies\(\)|createClient\(/.test(content);
        const usesAuthHelpers = /getUserId\(|getUserVenueId\(|getUserPromoterId\(|getUserOrganizerId\(|getUserIdAndOrganizer\(/.test(content);
        const usesDynamicRequest = /request\.url|request\.headers|request\.cookies|request\.nextUrl|searchParams|URLSearchParams|new URL\(/.test(content);
        
        // Check if it already has dynamic export
        const hasDynamic = /export const dynamic/.test(content);
        const hasRuntime = /export const runtime/.test(content);
        
        if ((usesCookies || usesAuthHelpers || usesDynamicRequest) && !hasDynamic && !hasRuntime) {
          routes.push(filePath);
        }
      }
    }
  }
  
  walkDir(API_DIR);
  return routes;
}

// Add dynamic export to a route file
function addDynamicExport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find the first import statement or export statement
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find where to insert (after imports, before first export function)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('export async function') || 
        lines[i].trim().startsWith('export function')) {
      insertIndex = i;
      break;
    }
    if (i === lines.length - 1) {
      insertIndex = lines.length;
    }
  }
  
  // Check if already has dynamic
  if (content.includes('export const dynamic')) {
    console.log(`⏭️  Skipping ${filePath} - already has dynamic export`);
    return false;
  }
  
  // Insert the dynamic export
  lines.splice(insertIndex, 0, '', "// Force dynamic rendering since this route uses cookies() or createClient()", 'export const dynamic = \'force-dynamic\';');
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return true;
}

// Main execution
console.log('🔍 Finding API routes that need dynamic export...\n');

const routes = findRoutesNeedingDynamic();
console.log(`Found ${routes.length} routes that need dynamic export\n`);

let updated = 0;
for (const route of routes) {
  const relativePath = path.relative(process.cwd(), route);
  if (addDynamicExport(route)) {
    console.log(`✅ Added dynamic export to ${relativePath}`);
    updated++;
  }
}

console.log(`\n✨ Updated ${updated} route files`);
console.log('\n💡 Note: Routes with edge runtime don\'t need dynamic export');

