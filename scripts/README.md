# Build Check and Auto-Fix Scripts

These scripts help detect and automatically fix common build errors in the CrowdStack monorepo.

## Usage

### Quick Check and Fix (Recommended)

```bash
pnpm check-fix
```

This runs the Node.js script that:
- Checks for missing dependencies (jsonwebtoken, puppeteer, etc.)
- Automatically adds missing dependencies
- Fixes shared package exports (removes server-only utilities from index)
- Runs a build check
- Reports any remaining issues

### Shell Script Alternative

```bash
pnpm check-fix:sh
# or
./scripts/check-and-fix.sh
```

## What It Fixes

### 1. Missing Dependencies
- Automatically adds `jsonwebtoken` and `@types/jsonwebtoken` to `packages/shared`
- Automatically adds `puppeteer` to `packages/shared` and `apps/app`

### 2. Shared Package Export Issues
- Removes QR utilities (`qr/generate`, `qr/verify`) from shared index exports
- Removes PDF utilities (`pdf/generate-statement`) from shared index exports
- These are server-only and shouldn't be bundled in client code

### 3. Build Errors
- Detects common "Module not found" errors
- Attempts to fix them automatically
- Reports remaining issues that need manual attention

## When to Use

Run this script:
- After pulling new changes
- After adding new dependencies
- When you see "Module not found" build errors
- Before committing changes

## Manual Fixes Still Needed

The script handles common issues, but you may still need to manually:
- Update import paths in API routes (use direct paths for server-only utilities)
- Fix TypeScript type errors
- Resolve other build-specific issues

## Example Output

```
🔍 Starting build check and auto-fix...
Checking dependencies...
✓ Added jsonwebtoken
✓ Added puppeteer
Removing QR utilities from shared index exports...
✓ Fixed shared package exports
Running build check...
✓ Build successful!

✅ All checks passed!
```

