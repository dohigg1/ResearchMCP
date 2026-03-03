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

// API clients for each service
class SemanticScholarAPI {
  private baseUrl = "https://api.semanticscholar.org/graph/v1";
  private userAgent = "Academic-Search-MCP/1.0";

  async searchPapers(query: string, limit: number = 10, fields?: string[]) {
    const defaultFields = [
      "paperId",
      "title",
      "abstract",
      "authors",
      "year",
      "citationCount",
      "url",
      "venue",
      "publicationDate",
    ];
    const fieldList = fields || defaultFields;

    const response = await axios.get(`${this.baseUrl}/paper/search`, {
      params: {
        query,
        limit,
        fields: fieldList.join(","),
      },
      headers: { "User-Agent": this.userAgent },
    });

    return response.data;
  }

  async getPaperDetails(paperId: string, fields?: string[]) {
    const defaultFields = [
      "paperId",
      "title",
      "abstract",
      "authors",
      "year",
      "citationCount",
      "referenceCount",
      "url",
      "venue",
      "publicationDate",
      "citations",
      "references",
    ];
    const fieldList = fields || defaultFields;

    const response = await axios.get(`${this.baseUrl}/paper/${paperId}`, {
      params: {
        fields: fieldList.join(","),
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
      params: {
        id_list: arxivId,
      },
    });

    const parsed = await parseStringPromise(response.data);
    const entry = parsed.feed.entry?.[0];

    if (!entry) {
      throw new Error("Paper not found");
    }

    return {
      id: entry.id[0],
      title: entry.title[0].trim(),
      summary: entry.summary[0].trim(),
      authors: entry.author?.map((a: any) => a.name[0]) || [],
      published: entry.published[0],
      updated: entry.updated[0],
      pdfUrl: entry.link?.find((l: any) => l.$.type === "application/pdf")?.$.href,
      categories: entry.category?.map((c: any) => c.$.term) || [],
      doi: entry["arxiv:doi"]?.[0]?._ || null,
    };
  }
}

class CrossRefAPI {
  private baseUrl = "https://api.crossref.org";
  private mailto = "academic-search@example.com";

  async searchWorks(query: string, rows: number = 10) {
    const response = await axios.get(`${this.baseUrl}/works`, {
      params: {
        query,
        rows,
        mailto: this.mailto,
      },
    });

    return response.data.message.items;
  }

  async getWorkByDOI(doi: string) {
    const response = await axios.get(`${this.baseUrl}/works/${doi}`, {
      params: {
        mailto: this.mailto,
      },
    });

    return response.data.message;
  }

  async searchByTitle(title: string) {
    const response = await axios.get(`${this.baseUrl}/works`, {
      params: {
        "query.title": title,
        rows: 5,
        mailto: this.mailto,
      },
    });

    return response.data.message.items;
  }
}

class SSRNAPI {
  private baseUrl = "https://papers.ssrn.com";

  async search(query: string) {
    return {
      message: "SSRN API integration requires institutional access or web scraping. Please use the SSRN website directly or contact SSRN for API access.",
      searchUrl: `${this.baseUrl}/sol3/results.cfm?npage=1&RequestTimeout=50000&q=${encodeURIComponent(query)}`,
    };
  }
}

// Initialize API clients
const semanticScholar = new SemanticScholarAPI();
const arxiv = new ArxivAPI();
const crossref = new CrossRefAPI();
const ssrn = new SSRNAPI();

// Define MCP tools
const tools: Tool[] = [
  {
    name: "semantic_scholar_search",
    description: "Search for academic papers using Semantic Scholar. Returns paper metadata including title, abstract, authors, citations, and publication details.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for papers",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_scholar_get_paper",
    description: "Get detailed information about a specific paper from Semantic Scholar using its paper ID.",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: {
          type: "string",
          description: "Semantic Scholar paper ID",
        },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "semantic_scholar_get_author",
    description: "Get author profile from Semantic Scholar including publication history, citation counts, and h-index.",
    inputSchema: {
      type: "object",
      properties: {
        author_id: {
          type: "string",
          description: "Semantic Scholar author ID",
        },
      },
      required: ["author_id"],
    },
  },
  {
    name: "arxiv_search",
    description: "Search arXiv preprint repository for papers in physics, mathematics, computer science, and related fields.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (can use arXiv search syntax like 'ti:title' or 'au:author')",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results (default: 10)",
          default: 10,
        },
        sort_by: {
          type: "string",
          description: "Sort order: relevance, lastUpdatedDate, or submittedDate (default: relevance)",
          enum: ["relevance", "lastUpdatedDate", "submittedDate"],
          default: "relevance",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "arxiv_get_paper",
    description: "Get detailed information about a specific arXiv paper using its arXiv ID (e.g., '2301.07041').",
    inputSchema: {
      type: "object",
      properties: {
        arxiv_id: {
          type: "string",
          description: "arXiv paper ID (e.g., '2301.07041')",
        },
      },
      required: ["arxiv_id"],
    },
  },
  {
    name: "crossref_search",
    description: "Search CrossRef database for published academic works across all publishers. Good for finding DOIs and citation data.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        rows: {
          type: "number",
          description: "Number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "crossref_get_by_doi",
    description: "Get detailed metadata for a work using its DOI (Digital Object Identifier).",
    inputSchema: {
      type: "object",
      properties: {
        doi: {
          type: "string",
          description: "DOI of the work (e.g., '10.1000/xyz123')",
        },
      },
      required: ["doi"],
    },
  },
  {
    name: "crossref_search_by_title",
    description: "Search CrossRef specifically by paper title for more precise matching.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Paper title to search for",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "ssrn_search",
    description: "Search SSRN (Social Science Research Network) for social science papers. Note: Limited functionality without institutional access.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["query"],
    },
  },
];

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "1.0.0" });
});

// SSE endpoint for MCP
app.get("/sse", async (req, res) => {
  console.log("New SSE connection established");

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Create MCP server instance
  const server = new Server(
    {
      name: "academic-search-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("Missing arguments");
      }

      switch (name) {
        case "semantic_scholar_search": {
          const result = await semanticScholar.searchPapers(
            args.query as string,
            (args.limit as number) || 10
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "semantic_scholar_get_paper": {
          const result = await semanticScholar.getPaperDetails(args.paper_id as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "semantic_scholar_get_author": {
          const result = await semanticScholar.getAuthor(args.author_id as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "arxiv_search": {
          const result = await arxiv.search(
            args.query as string,
            (args.max_results as number) || 10,
            (args.sort_by as string) || "relevance"
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "arxiv_get_paper": {
          const result = await arxiv.getPaper(args.arxiv_id as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "crossref_search": {
          const result = await crossref.searchWorks(
            args.query as string,
            (args.rows as number) || 10
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "crossref_get_by_doi": {
          const result = await crossref.getWorkByDOI(args.doi as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "crossref_search_by_title": {
          const result = await crossref.searchByTitle(args.title as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "ssrn_search": {
          const result = await ssrn.search(args.query as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Create SSE transport
  const transport = new SSEServerTransport("/message", res);

  // Handle client disconnect
  req.on("close", () => {
    console.log("SSE connection closed");
    transport.close();
  });

  // Connect server to transport
  await server.connect(transport);
  console.log("MCP server connected via SSE");
});

// Message endpoint for SSE
app.post("/message", async (req, res) => {
  // This endpoint receives messages from the client
  // The SSE transport handles the actual processing
  res.json({ received: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Academic Search MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
