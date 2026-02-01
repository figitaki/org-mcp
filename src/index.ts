#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v3";
import { DEFAULT_STATES, getTaskAgentContext, getWorkflowFilePath, parseTasksFromOrg, readOrgFile, setTaskState, appendTaskLog, writeOrgFile } from "./org.js";

/**
 * org-mcp (file-editing mode)
 *
 * Emacs/Org is the UI + source of truth; this MCP server provides:
 * - minimal task context for agents
 * - structured write-back (status/log)
 *
 * Workflow file path is controlled by ORG_MCP_WORKFLOW_FILE (defaults to ~/workflow.org).
 */

const server = new McpServer({
  name: "org-mcp",
  version: "0.1.0",
});

const STATES = DEFAULT_STATES;

server.registerTool(
  "list_tasks",
  {
    title: "List Tasks",
    description: "List tasks that have an :ID: property. Optionally filter by state or text query.",
    inputSchema: {
      state: z.string().optional().describe(`Filter by state (${STATES.join(", ")})`),
      query: z.string().optional().describe("Substring match against task title"),
      limit: z.number().int().positive().max(500).optional().describe("Max tasks to return"),
    },
  },
  async ({ state, query, limit }: { state?: string; query?: string; limit?: number }) => {
    const filePath = getWorkflowFilePath();
    const text = await readOrgFile(filePath);
    let tasks = parseTasksFromOrg(text, STATES);

    if (state) tasks = tasks.filter((t) => t.state === state);
    if (query) {
      const q = query.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (limit) tasks = tasks.slice(0, limit);

    const lines = tasks.map((t) => `${t.id}\t${t.state ?? ""}\t${t.title}`);

    return {
      content: [
        {
          type: "text",
          text: lines.length
            ? lines.join("\n")
            : "No matching tasks (tasks must have :ID: in properties).",
        },
      ],
    };
  }
);

server.registerTool(
  "get_task_context",
  {
    title: "Get Task Context",
    description: "Fetch the agent-visible context for a task (from the 'Agent Context' section), plus basic metadata.",
    inputSchema: {
      task_id: z.string().describe("Task :ID: property value"),
    },
  },
  async ({ task_id }: { task_id: string }) => {
    const filePath = getWorkflowFilePath();
    const text = await readOrgFile(filePath);
    const ctx = getTaskAgentContext(text, task_id, STATES);

    const payload = {
      id: ctx.id,
      state: ctx.state,
      title: ctx.title,
      properties: ctx.properties,
      agentContext: ctx.agentContext,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "set_task_state",
  {
    title: "Set Task State",
    description: `Set the TODO keyword/state for a task. Allowed: ${STATES.join(", ")}.`,
    inputSchema: {
      task_id: z.string().describe("Task :ID: property value"),
      state: z.string().describe("New state"),
    },
  },
  async ({ task_id, state }: { task_id: string; state: string }) => {
    const filePath = getWorkflowFilePath();
    const text = await readOrgFile(filePath);
    const next = setTaskState(text, task_id, state, STATES);
    await writeOrgFile(filePath, next);

    return {
      content: [
        {
          type: "text",
          text: `Updated task ${task_id} -> ${state}`,
        },
      ],
    };
  }
);

server.registerTool(
  "append_task_log",
  {
    title: "Append Task Log",
    description: "Append a timestamped entry under the task's 'Log' section (creates it if missing).",
    inputSchema: {
      task_id: z.string().describe("Task :ID: property value"),
      entry: z.string().describe("Log entry text"),
    },
  },
  async ({ task_id, entry }: { task_id: string; entry: string }) => {
    const filePath = getWorkflowFilePath();
    const text = await readOrgFile(filePath);
    const next = appendTaskLog(text, task_id, entry, { allowedStates: STATES });
    await writeOrgFile(filePath, next);

    return {
      content: [
        {
          type: "text",
          text: `Appended log entry to task ${task_id}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`org-mcp server running on stdio (file=${getWorkflowFilePath()})`);
}

main().catch(console.error);
