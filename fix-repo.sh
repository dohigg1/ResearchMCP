#!/bin/bash

# Script to fix ResearchMCP repository for Railway deployment
# Run this script on your local machine

echo "=== Fixing ResearchMCP for Railway ==="
echo ""

# Step 1: Clone the repo
echo "Step 1: Cloning repository..."
git clone https://github.com/dohigg1/ResearchMCP.git
cd ResearchMCP

# Step 2: Remove all existing files
echo "Step 2: Removing old files..."
rm -rf *

# Step 3: Download and extract the correct files
echo "Step 3: Downloading correct deployment files..."
# You need to download academic-search-mcp.zip and extract it here
echo "MANUAL STEP: Download academic-search-mcp.zip and extract these files here:"
echo "  - package.json"
echo "  - server.ts"
echo "  - tsconfig.json"
echo "  - Procfile"
echo ""
echo "Press Enter when you've extracted the files..."
read

# Step 4: Verify files exist
echo "Step 4: Verifying files..."
if [ -f "package.json" ] && [ -f "server.ts" ] && [ -f "tsconfig.json" ] && [ -f "Procfile" ]; then
    echo "✓ All required files found!"
else
    echo "✗ Missing files! Please make sure you extracted:"
    echo "  - package.json"
    echo "  - server.ts"
    echo "  - tsconfig.json"
    echo "  - Procfile"
    exit 1
fi

# Step 5: Commit and push
echo "Step 5: Committing and pushing..."
git add .
git commit -m "Fix: Add proper Node.js files for Railway deployment"
git push origin main --force

echo ""
echo "=== Done! ==="
echo "Now go to Railway and it should detect Node.js and build successfully!"
echo "Your SSE endpoint will be: https://YOUR-APP.railway.app/sse"
