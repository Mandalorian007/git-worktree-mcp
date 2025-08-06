import { z } from "zod";

export interface ToolDefinition<T extends z.ZodSchema = z.ZodSchema> {
  name: string;
  description: string;
  inputSchema: T;
}