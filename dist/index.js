#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GitWorktreeManager } from "./worktree-manager.js";
const server = new Server({
    name: "git-worktree-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
const worktreeManager = new GitWorktreeManager();
const createFeatureWorktreeTool = {
    name: "create_feature_worktree",
    description: "Create a new git worktree for feature development with automatic config file copying",
    inputSchema: z.object({
        featureName: z.string()
            .min(1, "Feature name cannot be empty")
            .regex(/^[a-zA-Z0-9_-]+$/, "Feature name can only contain letters, numbers, hyphens, and underscores")
            .refine(name => !name.startsWith("-") && !name.endsWith("-"), "Feature name cannot start or end with a hyphen")
            .describe("Name of the feature branch and worktree"),
    }),
    handler: async (args) => {
        const result = await worktreeManager.createFeatureWorktree(args.featureName);
        if (result.success && result.path) {
            return {
                ...result,
                hint: `To work on this feature with Claude Code, run: cd ${result.path} && export $(cat .env | xargs) && claude`
            };
        }
        return result;
    }
};
const listWorktreesTool = {
    name: "list_worktrees",
    description: "List all active git worktrees",
    inputSchema: z.object({}),
    handler: async () => {
        return await worktreeManager.listWorktrees();
    }
};
const cleanupWorktreeTool = {
    name: "cleanup_worktree",
    description: "Safely remove a git worktree after checking for uncommitted changes",
    inputSchema: z.object({
        featureName: z.string()
            .min(1, "Feature name cannot be empty")
            .regex(/^[a-zA-Z0-9_-]+$/, "Feature name can only contain letters, numbers, hyphens, and underscores")
            .refine(name => !name.startsWith("-") && !name.endsWith("-"), "Feature name cannot start or end with a hyphen")
            .describe("Name of the feature worktree to cleanup"),
    }),
    handler: async (args) => {
        return await worktreeManager.cleanupWorktree(args.featureName);
    }
};
const getWorktreeStatusTool = {
    name: "get_worktree_status",
    description: "Get the status of a specific git worktree including branch info and changes",
    inputSchema: z.object({
        featureName: z.string()
            .min(1, "Feature name cannot be empty")
            .regex(/^[a-zA-Z0-9_-]+$/, "Feature name can only contain letters, numbers, hyphens, and underscores")
            .refine(name => !name.startsWith("-") && !name.endsWith("-"), "Feature name cannot start or end with a hyphen")
            .describe("Name of the feature worktree to check status"),
    }),
    handler: async (args) => {
        return await worktreeManager.getWorktreeStatus(args.featureName);
    }
};
const tools = [createFeatureWorktreeTool, listWorktreesTool, cleanupWorktreeTool, getWorktreeStatusTool];
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema: zodToJsonSchema(inputSchema),
        })),
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        const tool = tools.find(t => t.name === name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const validatedArgs = tool.inputSchema.parse(args);
        const result = await tool.handler(validatedArgs);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: errorMessage,
                        tool: name,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Git Worktree MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
