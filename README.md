# org-mcp

An MCP server for managing agentic coding workflows with Emacs org-mode.

## Overview

org-mcp provides:
- An MCP server that manages task tracking through an Emacs daemon
- An Emacs org-mode extension with a dashboard for visualizing tasks
- Integration with Claude Code for spawning and managing AI coding agents

## Project Structure

```
org-mcp/
├── src/           # MCP server source code
├── emacs/         # Emacs org-mode extension
├── package.json   # Node.js dependencies
└── tsconfig.json  # TypeScript configuration
```

## Installation

### MCP Server

```bash
npm install
npm run build
```

### Emacs Extension

Add to your Emacs configuration:

```elisp
(add-to-list 'load-path "/path/to/org-mcp/emacs")
(require 'org-mcp)

;; Optionally set the workflow file location
(setq org-mcp-workflow-file "~/workflow.org")
```

## Usage

### MCP Server

The server runs on stdio and provides tools for:
- `create_task`: Create a new task in the org file
- `list_tasks`: List all tasks
- `update_task_status`: Update task status

### Emacs Commands

- `C-c m d`: Open the org-mcp dashboard
- `C-c m t`: Create a new task
- `C-c m l`: List all tasks
- `C-c m s`: Update task status
- `C-c m a`: Spawn a Claude Code agent

## Development Status

This is a minimal boilerplate template. Core functionality is stubbed out and ready for implementation.

## License

MIT
