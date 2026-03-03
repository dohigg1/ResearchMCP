#!/usr/bin/env node

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";

const app = express();

const sessions = new Map();

app.get("/sse", async (req, res) => {
  const sessionId = Math.random().toString(36).substring(7);
  
  const server = new Server(
    { name: "academic-search", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search_papers",
        description: "Search academic papers on Semantic Scholar",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
      {
        name: "search_arxiv",
        description: "Search arXiv preprints",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error("Missing arguments");

    let result;
    if (name === "search_papers") {
      const res = await axios.get("https://api.semanticscholar.org/graph/v1/paper/search", {
        params: { query: args.query, limit: 10, fields: "paperId,title,abstract,authors,year,citationCount" },
        headers: { "User-Agent": "Academic-MCP/1.0" },
      });
      result = res.data;
    } else if (name === "search_arxiv") {
      const res = await axios.get("http://export.arxiv.org/api/query", {
        params: { search_query: args.query, max_results: 10 },
      });
      const parsed = await parseStringPromise(res.data);
      result = (parsed.feed.entry || []).map((e: any) => ({
        id: e.id[0],
        title: e.title[0].trim(),
        summary: e.summary[0].trim(),
        authors: e.author?.map((a: any) => a.name[0]) || [],
      }));
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });

  const transport = new SSEServerTransport(`/message/${sessionId}`, res);
  sessions.set(sessionId, { server, transport });

  res.on("close", () => {
    sessions.delete(sessionId);
  });

  await server.connect(transport);
});

app.post("/message/:sessionId", express.text({ type: "*/*" }), async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  
  await session.transport.handlePostMessage(req, res);
});

app.listen(process.env.PORT || 3000, () => console.log("Server ready"));
