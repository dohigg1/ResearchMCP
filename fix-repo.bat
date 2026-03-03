@echo off
REM Script to fix ResearchMCP repository for Railway deployment
REM Run this script on your local machine

echo === Fixing ResearchMCP for Railway ===
echo.

REM Step 1: Clone the repo
echo Step 1: Cloning repository...
git clone https://github.com/dohigg1/ResearchMCP.git
cd ResearchMCP

REM Step 2: Remove all existing files
echo Step 2: Removing old files...
del /Q *.*

REM Step 3: Extract the correct files
echo Step 3: MANUAL STEP REQUIRED
echo Download academic-search-mcp.zip and extract these 4 files here:
echo   - package.json
echo   - server.ts
echo   - tsconfig.json
echo   - Procfile
echo.
echo Press any key when you've extracted the files...
pause

REM Step 4: Verify files exist
echo Step 4: Verifying files...
if not exist "package.json" goto missing
if not exist "server.ts" goto missing
if not exist "tsconfig.json" goto missing
if not exist "Procfile" goto missing
echo All required files found!
goto commit

:missing
echo Missing files! Please extract all 4 files from academic-search-mcp.zip
exit /b 1

:commit
REM Step 5: Commit and push
echo Step 5: Committing and pushing...
git add .
git commit -m "Fix: Add proper Node.js files for Railway deployment"
git push origin main --force

echo.
echo === Done! ===
echo Now go to Railway and it should detect Node.js and build successfully!
echo Your SSE endpoint will be: https://YOUR-APP.railway.app/sse
pause
