# Deploying as a Custom Connector in Claude.ai

This guide explains how to host your Academic Search MCP server and add it as a custom connector in Claude.ai.

## Overview

To use this as a custom connector in Claude.ai, you need to:
1. Host the MCP server with an SSE (Server-Sent Events) endpoint
2. Make it publicly accessible
3. Add the URL to Claude.ai's custom connector settings

## Option 1: Deploy to a Cloud Platform

### Deploy to Railway (Recommended - Easy)

1. **Create a Railway account** at https://railway.app

2. **Create a new project**:
   ```bash
   # In your academic-search-mcp directory
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Create a `Procfile`**:
   ```
   web: npm run start:server
   ```

4. **Push to Railway**:
   - Connect your GitHub repository to Railway
   - Or use Railway CLI: `railway up`

5. **Get your URL**:
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Your SSE endpoint will be: `https://your-app.railway.app/sse`

### Deploy to Render

1. **Create a Render account** at https://render.com

2. **Create a new Web Service**:
   - Connect your Git repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run server`

3. **Get your URL**:
   - Render provides: `https://your-app.onrender.com`
   - SSE endpoint: `https://your-app.onrender.com/sse`

### Deploy to Heroku

1. **Install Heroku CLI** and login

2. **Create and deploy**:
   ```bash
   heroku create your-academic-search-mcp
   git push heroku main
   ```

3. **Your SSE endpoint**:
   - `https://your-academic-search-mcp.herokuapp.com/sse`

### Deploy to Fly.io

1. **Install Fly CLI** and sign up

2. **Create `fly.toml`**:
   ```toml
   app = "academic-search-mcp"

   [build]
     builder = "heroku/buildpacks:20"

   [[services]]
     http_checks = []
     internal_port = 3000
     processes = ["app"]
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

3. **Deploy**:
   ```bash
   fly launch
   fly deploy
   ```

## Option 2: Self-Host

### Using a VPS (DigitalOcean, AWS, etc.)

1. **SSH into your server**:
   ```bash
   ssh user@your-server.com
   ```

2. **Install Node.js and clone your repo**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   git clone your-repo-url
   cd academic-search-mcp
   npm install
   npm run build
   ```

3. **Run with PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start build/server.js --name academic-search-mcp
   pm2 save
   pm2 startup
   ```

4. **Set up Nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /sse {
           proxy_pass http://localhost:3000/sse;
           proxy_http_version 1.1;
           proxy_set_header Connection '';
           proxy_buffering off;
           proxy_cache off;
           chunked_transfer_encoding off;
       }
   }
   ```

5. **Get SSL certificate**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Option 3: Local Development with Ngrok

For testing, you can use ngrok to expose your local server:

1. **Start your server locally**:
   ```bash
   npm run start:server
   ```

2. **In another terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

3. **Use the ngrok URL**:
   - Ngrok provides: `https://abc123.ngrok.io`
   - Your SSE endpoint: `https://abc123.ngrok.io/sse`

**Note**: Ngrok free tier URLs change each time you restart. This is only for testing.

## Adding to Claude.ai

Once your server is publicly accessible:

1. **Go to Claude.ai settings**

2. **Navigate to "Connectors" or "Integrations"**

3. **Click "Add Custom Connector"**

4. **Enter your details**:
   - **Name**: Academic Search
   - **URL**: `https://your-domain.com/sse`
   - **Description**: Search academic papers across Semantic Scholar, arXiv, CrossRef, and SSRN

5. **Save and test**

## Environment Variables

You may want to set environment variables for configuration:

```bash
# .env file
PORT=3000
CROSSREF_MAILTO=your-email@example.com
```

Update your code to use these:
```typescript
const PORT = process.env.PORT || 3000;
private mailto = process.env.CROSSREF_MAILTO || "academic-search@example.com";
```

## Security Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse:
   ```bash
   npm install express-rate-limit
   ```

2. **CORS**: Configure CORS appropriately for production

3. **API Keys**: If you add authentication, use environment variables

4. **Monitoring**: Set up logging and monitoring (e.g., Sentry, LogRocket)

## Verifying Your Deployment

Test your endpoints:

```bash
# Health check
curl https://your-domain.com/health

# SSE connection (will keep connection open)
curl https://your-domain.com/sse
```

## Troubleshooting

**Connection timeout**: Check firewall rules and ensure port 3000 (or your PORT) is accessible

**SSE not working**: Ensure your reverse proxy is configured for SSE (no buffering)

**CORS errors**: Add proper CORS headers in your Express app

**502 Bad Gateway**: Check if your Node.js server is running (`pm2 status`)

## Cost Estimates

- **Railway**: Free tier available, paid plans start at $5/month
- **Render**: Free tier available (may spin down), paid plans start at $7/month
- **Heroku**: No free tier anymore, starts at $5/month
- **Fly.io**: Generous free tier, paid plans start at $1.94/month
- **DigitalOcean VPS**: Starts at $4/month

## Next Steps

1. Choose a hosting platform
2. Deploy your server
3. Test the SSE endpoint
4. Add to Claude.ai as a custom connector
5. Start searching academic papers!

## Need Help?

If you encounter issues:
- Check server logs for errors
- Verify the SSE endpoint is accessible
- Test with curl or Postman first
- Ensure all dependencies are installed on the server
