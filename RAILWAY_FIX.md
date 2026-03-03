# Railway Deployment Fix

## The Problem

Railway failed because it received only markdown files and a tarball, not the actual source code.

## Solution: Deploy the Correct Files

### Option 1: GitHub (Recommended)

1. **Extract the archive**:
   ```bash
   tar -xzf railway-deploy.tar.gz
   cd academic-search-mcp-deploy
   ```

2. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Push to GitHub**:
   ```bash
   # Create a new repo on GitHub first, then:
   git remote add origin https://github.com/YOUR_USERNAME/academic-search-mcp.git
   git push -u origin main
   ```

4. **Deploy on Railway**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically build and deploy

5. **Get your URL**:
   - Railway will show your deployment URL
   - Your SSE endpoint: `https://your-app.railway.app/sse`

### Option 2: Railway CLI

1. **Extract and navigate**:
   ```bash
   tar -xzf railway-deploy.tar.gz
   cd academic-search-mcp-deploy
   ```

2. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

3. **Login and deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

4. **Get your URL**:
   ```bash
   railway domain
   ```

### Option 3: Use Render Instead

Render might be easier for direct deployment:

1. **Extract the files**:
   ```bash
   tar -xzf railway-deploy.tar.gz
   ```

2. **Go to** https://render.com

3. **Create New Web Service**:
   - Connect GitHub repo OR upload files directly
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Deploy** and get your URL

## What's in the Deploy Package

The `railway-deploy.tar.gz` contains:

```
academic-search-mcp-deploy/
├── server.ts          # Main server code
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── Procfile          # Railway start command
├── .gitignore        # Git ignore rules
└── README.md         # Documentation
```

## Verify Deployment

Once deployed, test your server:

```bash
# Replace YOUR_URL with your actual deployment URL
curl https://YOUR_URL/health
```

Expected response:
```json
{"status":"healthy","version":"1.0.0"}
```

## Add to Claude.ai

1. Go to Claude.ai Settings
2. Find "Connectors" section
3. Click "Add Custom Connector"
4. Enter:
   - Name: `Academic Search`
   - URL: `https://YOUR_URL/sse`  (note the /sse at the end)
5. Save

## Test in Claude

Try these prompts:
- "Search for papers about neural networks"
- "Find papers on arXiv about transformers"
- "Look up DOI 10.1038/nature14539"

## Common Issues

**"Cannot find module"**: Dependencies didn't install
- Solution: Check Railway logs, ensure package.json is correct

**"Build failed"**: TypeScript compilation error
- Solution: Railway should compile automatically; check logs

**"Port already in use"**: Railway sets PORT automatically
- Solution: No action needed, Railway handles this

**"SSE not connecting"**: Wrong URL or server not running
- Solution: Verify `/health` endpoint works first, then try `/sse`

## Alternative: Quick Test with Local Tunnel

If you want to test quickly without full deployment:

```bash
# Extract and navigate
tar -xzf railway-deploy.tar.gz
cd academic-search-mcp-deploy

# Install and build
npm install
npm run build

# Start server
npm start

# In another terminal, use ngrok
ngrok http 3000
```

Use the ngrok HTTPS URL in Claude.ai (remember to add `/sse`).

## Need Help?

If deployment still fails:
1. Check Railway/Render logs for specific errors
2. Ensure all files extracted correctly
3. Verify package.json has all dependencies
4. Try deploying to Render as an alternative

The server code is tested and working - the issue is just getting it deployed correctly!
