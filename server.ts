#!/usr/bin/env node
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";

const semanticScholar = {
  async searchPapers(query: string, limit = 10) {
    const res = await axios.get("https://api.semanticscholar.org/graph/v1/paper/search", {
      params: { query, limit, fields: "paperId,title,abstract,authors,year,citationCount,url" },
      headers: { "User-Agent": "Academic-MCP/1.0" },
    });
    return res.data;
  }
};

const app = express();

app.get("/sse", async (req, res) => {
  const server = new Server(
    { name: "academic-search", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search_papers",
        description: "Search academic papers",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error("Missing arguments");

    if (name === "search_papers") {
      const result = await semanticScholar.searchPapers(args.query as string);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", express.text({ type: "*/*" }), (req, res) => {
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => console.log("Server ready"));
