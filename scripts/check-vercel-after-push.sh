#!/bin/bash

# Auto-check Vercel build status after git push
# This script should be run after pushing to check if the build succeeded

set -e

PROJECT_NAME="crowdstack"
MAX_WAIT_TIME=300  # 5 minutes
CHECK_INTERVAL=10  # Check every 10 seconds

echo "🔍 Checking Vercel build status for $PROJECT_NAME..."
echo ""

# Get the latest deployment
LATEST_DEPLOYMENT=$(vercel ls $PROJECT_NAME 2>&1 | awk 'NR==4 {print $3}')

if [ -z "$LATEST_DEPLOYMENT" ]; then
  echo "❌ Could not find latest deployment"
  exit 1
fi

echo "📦 Latest deployment: $LATEST_DEPLOYMENT"
echo "⏳ Waiting for build to complete (max ${MAX_WAIT_TIME}s)..."
echo ""

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
  STATUS=$(vercel inspect "$LATEST_DEPLOYMENT" --json 2>&1 | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
  
  if [ "$STATUS" = "READY" ]; then
    echo ""
    echo "✅ Build succeeded!"
    echo "🌐 Deployment URL: $LATEST_DEPLOYMENT"
    exit 0
  elif [ "$STATUS" = "ERROR" ] || [ "$STATUS" = "CANCELED" ]; then
    echo ""
    echo "❌ Build failed with status: $STATUS"
    echo ""
    echo "📋 Build logs:"
    vercel inspect "$LATEST_DEPLOYMENT" --logs 2>&1 | grep -A 30 "Error\|Failed" | head -50
    exit 1
  fi
  
  # Show progress
  if [ $((ELAPSED % 30)) -eq 0 ]; then
    echo "   Still building... (${ELAPSED}s elapsed)"
  fi
  
  sleep $CHECK_INTERVAL
  ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

echo ""
echo "⏰ Timeout waiting for build to complete"
echo "📋 Checking final status..."

STATUS=$(vercel inspect "$LATEST_DEPLOYMENT" --json 2>&1 | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")

if [ "$STATUS" = "READY" ]; then
  echo "✅ Build succeeded!"
  exit 0
elif [ "$STATUS" = "ERROR" ]; then
  echo "❌ Build failed"
  echo ""
  echo "📋 Build logs:"
  vercel inspect "$LATEST_DEPLOYMENT" --logs 2>&1 | grep -A 30 "Error\|Failed" | head -50
  exit 1
else
  echo "⚠️  Build still in progress (status: $STATUS)"
  echo "Check manually: vercel inspect $LATEST_DEPLOYMENT --logs"
  exit 0
fi
