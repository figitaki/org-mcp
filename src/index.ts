#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Minimal MCP server for org-mcp
 * Provides tools for managing agentic workflows with Emacs org-mode
 */

class OrgMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "org-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_task",
            description: "Create a new task in the org file",
            inputSchema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Task title",
                },
                description: {
                  type: "string",
                  description: "Task description",
                },
              },
              required: ["title"],
            },
          },
          {
            name: "list_tasks",
            description: "List all tasks from the org file",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "update_task_status",
            description: "Update the status of a task",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task identifier",
                },
                status: {
                  type: "string",
                  description: "New status (TODO, IN-PROGRESS, DONE, etc.)",
                },
              },
              required: ["task_id", "status"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "create_task":
          return this.createTask(args);
        case "list_tasks":
          return this.listTasks(args);
        case "update_task_status":
          return this.updateTaskStatus(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async createTask(args: any) {
    // TODO: Implement task creation logic
    // This will interact with the Emacs daemon to create tasks in the org file
    return {
      content: [
        {
          type: "text",
          text: `Task creation stub: ${args.title}`,
        },
      ],
    };
  }

  private async listTasks(args: any) {
    // TODO: Implement task listing logic
    // This will query the Emacs daemon for tasks from the org file
    return {
      content: [
        {
          type: "text",
          text: "Task listing stub",
        },
      ],
    };
  }

  private async updateTaskStatus(args: any) {
    // TODO: Implement task status update logic
    // This will communicate with the Emacs daemon to update task status
    return {
      content: [
        {
          type: "text",
          text: `Status update stub: ${args.task_id} -> ${args.status}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("org-mcp server running on stdio");
  }
}

const server = new OrgMCPServer();
server.run().catch(console.error);
