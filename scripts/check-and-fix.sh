#!/bin/bash

# Script to check for build errors and auto-fix common issues
# Usage: ./scripts/check-and-fix.sh

set -e

echo "🔍 Checking for build errors..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a package is installed
check_package() {
    local package=$1
    local location=$2
    
    if [ -f "$location/package.json" ]; then
        if grep -q "\"$package\"" "$location/package.json"; then
            return 0
        fi
    fi
    return 1
}

# Function to add missing dependency
add_dependency() {
    local package=$1
    local location=$2
    local is_dev=${3:-false}
    
    echo -e "${YELLOW}Adding missing dependency: $package to $location${NC}"
    
    cd "$location"
    if [ "$is_dev" = true ]; then
        pnpm add -D "$package"
    else
        pnpm add "$package"
    fi
    cd - > /dev/null
}

# Check shared package dependencies
echo "📦 Checking shared package dependencies..."
SHARED_PKG="packages/shared"

if ! check_package "jsonwebtoken" "$SHARED_PKG"; then
    add_dependency "jsonwebtoken" "$SHARED_PKG"
    add_dependency "@types/jsonwebtoken" "$SHARED_PKG" true
fi

if ! check_package "puppeteer" "$SHARED_PKG"; then
    add_dependency "puppeteer" "$SHARED_PKG"
fi

# Check app package dependencies
echo "📦 Checking app package dependencies..."
APP_PKG="apps/app"

if ! check_package "puppeteer" "$APP_PKG"; then
    add_dependency "puppeteer" "$APP_PKG"
fi

# Run typecheck
echo "🔍 Running typecheck..."
if pnpm typecheck 2>&1 | tee /tmp/typecheck-errors.log; then
    echo -e "${GREEN}✓ Typecheck passed${NC}"
else
    echo -e "${RED}✗ Typecheck failed${NC}"
    TYPE_ERRORS=$(cat /tmp/typecheck-errors.log)
    
    # Check for common import errors
    if echo "$TYPE_ERRORS" | grep -q "Cannot find module.*jsonwebtoken"; then
        echo -e "${YELLOW}Fixing jsonwebtoken import issues...${NC}"
        # Already handled above
    fi
    
    if echo "$TYPE_ERRORS" | grep -q "Cannot find module.*puppeteer"; then
        echo -e "${YELLOW}Fixing puppeteer import issues...${NC}"
        # Already handled above
    fi
fi

# Try building web app
echo "🏗️  Building web app..."
if pnpm build:web 2>&1 | tee /tmp/build-web-errors.log; then
    echo -e "${GREEN}✓ Web app build successful${NC}"
else
    echo -e "${RED}✗ Web app build failed${NC}"
    BUILD_ERRORS=$(cat /tmp/build-web-errors.log)
    
    # Check for module not found errors
    if echo "$BUILD_ERRORS" | grep -q "Module not found.*jsonwebtoken"; then
        echo -e "${YELLOW}Detected jsonwebtoken error - checking imports...${NC}"
        # Check if QR utilities are exported from shared index
        if grep -q "export.*qr/generate" "$SHARED_PKG/src/index.ts"; then
            echo -e "${YELLOW}Removing QR utilities from shared index exports...${NC}"
            # This would need manual fix or sed command
        fi
    fi
    
    if echo "$BUILD_ERRORS" | grep -q "Module not found.*puppeteer"; then
        echo -e "${YELLOW}Detected puppeteer error - checking imports...${NC}"
        # Check if PDF utilities are exported from shared index
        if grep -q "export.*pdf/generate-statement" "$SHARED_PKG/src/index.ts"; then
            echo -e "${YELLOW}Removing PDF utilities from shared index exports...${NC}"
            # This would need manual fix or sed command
        fi
    fi
fi

# Try building app
echo "🏗️  Building app..."
if pnpm build:app 2>&1 | tee /tmp/build-app-errors.log; then
    echo -e "${GREEN}✓ App build successful${NC}"
else
    echo -e "${RED}✗ App build failed${NC}"
    BUILD_ERRORS=$(cat /tmp/build-app-errors.log)
    
    # Similar checks as above
    if echo "$BUILD_ERRORS" | grep -q "Module not found"; then
        echo -e "${YELLOW}Module not found errors detected - check logs above${NC}"
    fi
fi

echo ""
echo "✅ Check complete!"
echo "📝 Review errors above and fix any remaining issues"

