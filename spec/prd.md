# Git Worktree MCP Server - Product Requirements Document

## Problem
Developers waste time switching between git branches, lose context, and deal with broken environments when configuration files don't get copied. Git worktrees solve this but are too complex for most people to use effectively.

## Solution
An MCP server that makes git worktrees easy to use through AI assistants. Create isolated feature environments with one command, automatically copy config files, and clean up safely when done.

## Core Value
Work on multiple features simultaneously without context switching or environment setup friction.

## Features

### Core Tools
- `create_feature_worktree(feature_name)` - Create isolated feature environment  
- `list_worktrees()` - Show all active worktrees
- `cleanup_worktree(feature_name)` - Safe removal with conflict checks
- `get_worktree_status(feature_name)` - Check branch status and changes

### Smart Setup
- Auto-copy config files (`.env*`, `.mcp.json`, `.claude/`)
- Validate feature names and prevent conflicts  
- Cross-platform compatibility
- Safety checks before deletion

### Future Ideas
- GitHub/GitLab PR integration
- Smart rebasing and sync
- Project-specific templates
- Usage analytics

## Technical Approach

### Implementation
- **Node.js + TypeScript** for the MCP server
- **Hybrid approach**: Git CLI for worktree ops + Node.js for file copying
- **Cross-platform**: Handle Windows/macOS/Linux differences
- **Configuration**: JSON file for project-specific settings

### MCP Tools Interface
```typescript
interface GitWorktreeMCP {
  create_feature_worktree(featureName: string): Promise<WorktreeResult>
  list_worktrees(): Promise<WorktreeInfo[]>
  cleanup_worktree(featureName: string): Promise<CleanupResult>
  get_worktree_status(featureName: string): Promise<WorktreeStatus>
}
```

### Example Usage
```typescript
// AI assistant can now do:
"I need to work on user authentication"
→ create_feature_worktree("user-auth") 
→ Creates .worktree/user-auth with feature/user-auth branch
→ Copies all .env files, .mcp.json, .claude/ directory
→ Ready to code immediately
```

---

*Simple, focused tool that solves real developer pain points.*