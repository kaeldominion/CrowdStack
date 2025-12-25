#!/bin/bash

# Script to start the app server with error checking
set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting CrowdStack App Server..."
echo ""

# Check if port 3007 is already in use
if lsof -ti:3007 > /dev/null 2>&1; then
  echo "⚠️  Port 3007 is already in use. Killing existing process..."
  kill -9 $(lsof -ti:3007) 2>/dev/null || true
  sleep 2
fi

# Navigate to app directory
cd apps/app

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  cd ../..
  pnpm install
  cd apps/app
fi

# Start the server
echo "🌐 Starting Next.js dev server on port 3007..."
echo ""
pnpm dev







