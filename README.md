# org-mcp

An MCP server for managing agentic coding workflows with Emacs org-mode.

**Design intent:** Emacs/Org is the UI + source of truth. `org-mcp` is the context gateway that lets coding agents retrieve *minimum viable task context* and write back status/logs.

## Overview

org-mcp provides:
- An MCP server (SDK 1.24.3) that reads/writes a workflow Org file directly (no Emacs daemon required)
- An Emacs org-mode extension (optional) for interacting with the workflow in-editor

Built with:
- MCP SDK 1.24.3 with modern `McpServer` API
- Bun runtime
- Zod for schema validation

## Workflow file

`org-mcp` reads/writes a single Org file on disk.

- Path: `ORG_MCP_WORKFLOW_FILE` (defaults to `~/workflow.org`)
- A task is any Org heading with an `:ID:` property in its `:PROPERTIES:` drawer.
- States are expressed as Org TODO keywords:
  - `BACKLOG`, `TODO`, `IN-PROGRESS`, `IN-REVIEW`, `DONE`, `CANCELLED`

Within a task, these subheadings have special meaning:
- `** Agent Context` — exported to agents via `get_task_context`
- `** Private Notes` — not exported (convention)
- `** Log` — append-only entries written by agents via `append_task_log`

## Project Structure

```
org-mcp/
├── src/           # MCP server + org parsing
├── emacs/         # Emacs org-mode extension
├── test/          # Bun tests
├── package.json
└── tsconfig.json
```

## Installation

Prereq: [Bun](https://bun.sh)

```bash
bun install
bun run typecheck
bun test
bun run build
```

## Usage

Run on stdio:

```bash
export ORG_MCP_WORKFLOW_FILE=~/workflow.org
bun run dev
```

### Tools

- `list_tasks` — list tasks (id/state/title), with optional filters
- `get_task_context` — returns JSON (as text) including `Agent Context`
- `set_task_state` — updates the task TODO keyword
- `append_task_log` — appends a timestamped entry under `** Log`

## License

MIT
