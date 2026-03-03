# Quick Setup: Adding to Claude.ai as Custom Connector

## Step-by-Step Guide

### Step 1: Deploy Your Server

**Option A: Railway (Easiest)**

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect this repository
4. Railway will automatically detect and deploy
5. Copy your deployment URL (e.g., `https://your-app.railway.app`)

**Option B: Render**

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Set:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run server`
5. Deploy and copy your URL

**Option C: Quick Test with Ngrok**

```bash
# Terminal 1: Start server
npm install
npm run build
npm run server

# Terminal 2: Expose with ngrok
ngrok http 3000
```

Copy the https URL from ngrok (e.g., `https://abc123.ngrok.io`)

### Step 2: Verify Deployment

Test your server is running:

```bash
# Replace YOUR_URL with your actual URL
curl https://YOUR_URL/health

# Should return: {"status":"healthy","version":"1.0.0"}
```

### Step 3: Add to Claude.ai

1. **Open Claude.ai** and go to Settings

2. **Find Custom Connectors**:
   - Look for "Connectors", "Integrations", or "Tools" section
   - Click "Add Custom Connector" or similar option

3. **Enter Your Connector Details**:
   - **Name**: `Academic Search`
   - **SSE URL**: `https://YOUR_URL/sse`
   - **Description**: `Search academic papers across Semantic Scholar, arXiv, CrossRef, and SSRN`
   - **Icon** (optional): Choose an appropriate icon

4. **Save** and wait for verification

### Step 4: Test Your Connector

Once added, try these prompts in Claude.ai:

- "Search for papers about transformers in machine learning"
- "Find papers by Geoffrey Hinton on arXiv"
- "Look up the paper with DOI 10.1038/nature14539"
- "Search Semantic Scholar for recent papers on reinforcement learning"

## Troubleshooting

**"Unable to connect to connector"**
- Verify your server is running: `curl https://YOUR_URL/health`
- Check the URL ends with `/sse`
- Ensure the server is publicly accessible

**"Connector added but tools don't appear"**
- Restart Claude.ai
- Check server logs for errors
- Verify the SSE endpoint is working

**"Rate limit errors"**
- Add delays between requests
- Set your email in the CrossRef configuration

## Environment Variables

If deploying to Railway/Render/Heroku, add these environment variables:

```
PORT=3000
CROSSREF_MAILTO=your-email@example.com
```

## URLs to Remember

- **Health Check**: `https://YOUR_URL/health`
- **SSE Endpoint**: `https://YOUR_URL/sse` (use this in Claude.ai)

## Free Hosting Tiers

- **Railway**: Free tier with 500 hours/month
- **Render**: Free tier (spins down after inactivity)
- **Fly.io**: 3 shared VMs free
- **Ngrok**: Free tier (URL changes on restart)

## Production Checklist

- [ ] Server deployed and accessible
- [ ] Health endpoint returns 200 OK
- [ ] SSE endpoint accessible
- [ ] Environment variables set (if needed)
- [ ] Added to Claude.ai custom connectors
- [ ] Tested with sample queries

## Need More Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions on:
- Different hosting platforms
- SSL certificates
- Custom domains
- Security configuration
- Monitoring and logging

## Current Status

The server includes 9 tools:
- ✅ semantic_scholar_search
- ✅ semantic_scholar_get_paper
- ✅ semantic_scholar_get_author
- ✅ arxiv_search
- ✅ arxiv_get_paper
- ✅ crossref_search
- ✅ crossref_get_by_doi
- ✅ crossref_search_by_title
- ✅ ssrn_search

All tools are ready to use once your connector is added!
