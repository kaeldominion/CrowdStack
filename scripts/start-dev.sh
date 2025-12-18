#!/bin/bash

# Script to start both dev servers
# This script will use npx to run pnpm if pnpm is not installed

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting CrowdStack Development Servers..."
echo ""

# Check if pnpm is available
if command -v pnpm &> /dev/null; then
  echo "✅ Using pnpm"
  PNPM_CMD="pnpm"
elif command -v npx &> /dev/null; then
  echo "⚠️  pnpm not found, using npx pnpm"
  PNPM_CMD="npx -y pnpm@8.15.0"
else
  echo "❌ Neither pnpm nor npx found. Please install Node.js and npm first."
  exit 1
fi

# Check if concurrently is installed
if [ ! -d "node_modules/.bin/concurrently" ] && [ ! -f "node_modules/.bin/concurrently" ]; then
  echo "📦 Installing dependencies (this may take a minute)..."
  $PNPM_CMD install
fi

echo ""
echo "🌐 Starting both servers..."
echo "   - Web app: http://localhost:3006"
echo "   - B2B app: http://localhost:3007"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
$PNPM_CMD dev:all

