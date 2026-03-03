#!/usr/bin/env node

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";

// API clients
class SemanticScholarAPI {
  private baseUrl = "https://api.semanticscholar.org/graph/v1";
  private userAgent = "Academic-Search-MCP/1.0";

  async searchPapers(query: string, limit: number = 10) {
    const response = await axios.get(`${this.baseUrl}/paper/search`, {
      params: {
        query,
        limit,
        fields: "paperId,title,abstract,authors,year,citationCount,url,venue,publicationDate",
      },
      headers: { "User-Agent": this.userAgent },
    });
    return response.data;
  }

  async getPaperDetails(paperId: string) {
    const response = await axios.get(`${this.baseUrl}/paper/${paperId}`, {
      params: {
        fields: "paperId,title,abstract,authors,year,citationCount,referenceCount,url,venue,publicationDate",
      },
      headers: { "User-Agent": this.userAgent },
    });
    return response.data;
  }

  async getAuthor(authorId: string) {
    const response = await axios.get(`${this.baseUrl}/author/${authorId}`, {
      params: {
        fields: "authorId,name,paperCount,citationCount,hIndex,papers",
      },
      headers: { "User-Agent": this.userAgent },
    });
    return response.data;
  }
}

class ArxivAPI {
  private baseUrl = "http://export.arxiv.org/api/query";

  async search(query: string, maxResults: number = 10, sortBy: string = "relevance") {
    const response = await axios.get(this.baseUrl, {
      params: {
        search_query: query,
        max_results: maxResults,
        sortBy,
        sortOrder: "descending",
      },
    });

    const parsed = await parseStringPromise(response.data);
    const entries = parsed.feed.entry || [];

    return entries.map((entry: any) => ({
      id: entry.id[0],
      title: entry.title[0].trim(),
      summary: entry.summary[0].trim(),
      authors: entry.author?.map((a: any) => a.name[0]) || [],
      published: entry.published[0],
      updated: entry.updated[0],
      pdfUrl: entry.link?.find((l: any) => l.$.type === "application/pdf")?.$.href,
      categories: entry.category?.map((c: any) => c.$.term) || [],
    }));
  }

  async getPaper(arxivId: string) {
    const response = await axios.get(this.baseUrl, {
      params: { id_list: arxivId },
    });

    const parsed = await parseStringPromise(response.data);
    const entry = parsed.feed.entry?.[0];

    if (!entry) throw new Error("Paper not found");

    return {
      id: entry.id[0],
      title: entry.title[0].trim(),
      summary: entry.summary[0].trim(),
      authors: entry.author?.map((a: any) => a.name[0]) || [],
      published: entry.published[0],
      updated: entry.updated[0],
      pdfUrl: entry.link?.find((l: any) => l.$.type === "application/pdf")?.$.href,
      categories: entry.category?.map((c: any) => c.$.term) || [],
    };
  }
}

class CrossRefAPI {
  private baseUrl = "https://api.crossref.org";
  private mailto = "academic-search@example.com";

  async searchWorks(query: string, rows: number = 10) {
    const response = await axios.get(`${this.baseUrl}/works`, {
      params: { query, rows, mailto: this.mailto },
    });
    return response.data.message.items;
  }

  async getWorkByDOI(doi: string) {
    const response = await axios.get(`${this.baseUrl}/works/${doi}`, {
      params: { mailto: this.mailto },
    });
    return response.data.message;
  }

  async searchByTitle(title: string) {
    const response = await axios.get(`${this.baseUrl}/works`, {
      params: { "query.title": title, rows: 5, mailto: this.mailto },
    });
    return response.data.message.items;
  }
}

class SSRNAPI {
  private baseUrl = "https://papers.ssrn.com";

  async search(query: string) {
    return {
      message: "SSRN requires institutional access. Use the website directly.",
      searchUrl: `${this.baseUrl}/sol3/results.cfm?q=${encodeURIComponent(query)}`,
    };
  }
}

const semanticScholar = new SemanticScholarAPI();
const arxiv = new ArxivAPI();
const crossref = new CrossRefAPI();
const ssrn = new SSRNAPI();

const tools: Tool[] = [
  {
    name: "semantic_scholar_search",
    description: "Search academic papers on Semantic Scholar",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default: 10)", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_scholar_get_paper",
    description: "Get paper details by Semantic Scholar ID",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: { type: "string", description: "Semantic Scholar paper ID" },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "semantic_scholar_get_author",
    description: "Get author profile from Semantic Scholar",
    inputSchema: {
      type: "object",
      properties: {
        author_id: { type: "string", description: "Semantic Scholar author ID" },
      },
      required: ["author_id"],
    },
  },
  {
    name: "arxiv_search",
    description: "Search arXiv preprints",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "number", description: "Max results (default: 10)", default: 10 },
        sort_by: {
          type: "string",
          description: "Sort by: relevance, lastUpdatedDate, submittedDate",
          enum: ["relevance", "lastUpdatedDate", "submittedDate"],
          default: "relevance",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "arxiv_get_paper",
    description: "Get arXiv paper by ID",
    inputSchema: {
      type: "object",
      properties: {
        arxiv_id: { type: "string", description: "arXiv ID (e.g., '2301.07041')" },
      },
      required: ["arxiv_id"],
    },
  },
  {
    name: "crossref_search",
    description: "Search CrossRef for published works",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        rows: { type: "number", description: "Max results (default: 10)", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "crossref_get_by_doi",
    description: "Get paper metadata by DOI",
    inputSchema: {
      type: "object",
      properties: {
        doi: { type: "string", description: "DOI (e.g., '10.1000/xyz123')" },
      },
      required: ["doi"],
    },
  },
  {
    name: "crossref_search_by_title",
    description: "Search CrossRef by paper title",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Paper title" },
      },
      required: ["title"],
    },
  },
  {
    name: "ssrn_search",
    description: "Search SSRN (limited functionality)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "1.0.0" });
});

app.get("/sse", async (req, res) => {
  console.log("SSE connection");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const server = new Server(
    { name: "academic-search-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      if (!args) throw new Error("Missing arguments");

      let result;
      switch (name) {
        case "semantic_scholar_search":
          result = await semanticScholar.searchPapers(args.query as string, args.limit as number);
          break;
        case "semantic_scholar_get_paper":
          result = await semanticScholar.getPaperDetails(args.paper_id as string);
          break;
        case "semantic_scholar_get_author":
          result = await semanticScholar.getAuthor(args.author_id as string);
          break;
        case "arxiv_search":
          result = await arxiv.search(
            args.query as string,
            args.max_results as number,
            args.sort_by as string
          );
          break;
        case "arxiv_get_paper":
          result = await arxiv.getPaper(args.arxiv_id as string);
          break;
        case "crossref_search":
          result = await crossref.searchWorks(args.query as string, args.rows as number);
          break;
        case "crossref_get_by_doi":
          result = await crossref.getWorkByDOI(args.doi as string);
          break;
        case "crossref_search_by_title":
          result = await crossref.searchByTitle(args.title as string);
          break;
        case "ssrn_search":
          result = await ssrn.search(args.query as string);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new SSEServerTransport("/message", res);
  
  req.on("close", () => {
    console.log("SSE closed");
    transport.close();
  });

  await server.connect(transport);
  console.log("MCP connected");
});

app.post("/message", express.text({ type: "*/*" }), (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
