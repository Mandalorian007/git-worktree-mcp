# Git Worktree MCP Server

Manage git worktrees through AI assistants. Create isolated feature environments with automatic config copying.

## Features

- **create_feature_worktree** - Create isolated worktree with feature branch
- **list_worktrees** - Show all active worktrees
- **cleanup_worktree** - Safe removal with uncommitted change checks
- **get_worktree_status** - Check branch status and changes

## Setup

1. Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "git-worktree": {
      "command": "npx",
      "args": ["github:Mandalorian007/git-worktree-mcp"]
    }
  }
}
```

2. Ask Claude to:
- "Create a worktree for user-auth feature"
- "List my worktrees" 
- "Clean up the user-auth worktree"
- "Check worktree status"

## Claude Code Workflow

Perfect for switching between features while using Claude Code CLI:

```bash
# Create worktree via MCP
# Navigate to new worktree directory
cd .worktree/user-auth

# Start Claude Code in the worktree directory
export $(cat .env | xargs) && claude
```

Each worktree gets its own `.env`, `.claude/`, and config files automatically. Launch Claude Code from within the worktree directory to work on that specific feature in isolation.

## What it does

- Creates `.worktree/feature-name` with `feature/feature-name` branch
- Copies `.env*`, `.mcp.json`, `.claude/`, `.vscode/` files automatically
- Safe cleanup with uncommitted change detection

## Requirements

- Node.js 18+
- Git repository