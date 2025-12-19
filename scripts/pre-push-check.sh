#!/bin/bash

# Pre-push build check for CrowdStack unified app
# Run this before pushing to catch build errors locally

set -e

echo "🔍 Running pre-push checks for unified app..."
echo ""

cd "$(dirname "$0")/.."

# Check TypeScript compilation
echo "📝 Checking TypeScript..."
cd apps/unified
npx tsc --noEmit 2>&1 | head -50

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo "❌ TypeScript errors found! Fix them before pushing."
    exit 1
fi

echo "✅ TypeScript check passed"
echo ""

# Run ESLint
echo "🔧 Running ESLint..."
npx next lint 2>&1 | head -50

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo "⚠️  ESLint warnings/errors found (check above)"
fi

echo ""
echo "✅ Pre-push checks complete!"
echo ""
echo "To run a full build test: pnpm build:unified"

