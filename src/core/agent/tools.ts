/**
 * Tool Helper Functions
 * 
 * @module core/agent/tools
 * @description
 * Utility functions for creating and managing tools.
 * 
 * **Features**:
 * - Simple tool() function for creating tools
 * - Type-safe tool definitions
 * - AI SDK v5 compatibility
 * - Zod schema validation support
 * 
 * @author Tawk.to
 * @license MIT
 * @version 2.0.0
 */

import { z } from 'zod';
import type { CoreTool } from './types';

/**
 * Create a tool that agents can use.
 * Provides a simple, type-safe way to define agent capabilities.
 * 
 * @template TParams - Zod schema type for tool input parameters
 * @param {Object} config - Tool configuration
 * @param {string} config.description - Human-readable description of what the tool does
 * @param {z.ZodObject} config.inputSchema - Zod schema for validating tool inputs
 * @param {Function} config.execute - Function that executes the tool logic
 * @param {boolean | Function} [config.enabled] - Whether the tool is enabled (can be dynamic)
 * @returns {CoreTool} Tool definition compatible with AI SDK v5
 * 
 * @example Basic Tool
 * ```typescript
 * import { tool } from 'tawk-agents-sdk';
 * import { z } from 'zod';
 * 
 * const calculator = tool({
 *   description: 'Perform mathematical calculations',
 *   inputSchema: z.object({
 *     expression: z.string().describe('Math expression to evaluate')
 *   }),
 *   execute: async ({ expression }) => {
 *     return eval(expression);
 *   }
 * });
 * ```
 * 
 * @example Tool with Context
 * ```typescript
 * const getUserData = tool({
 *   description: 'Get user data from database',
 *   inputSchema: z.object({
 *     userId: z.string()
 *   }),
 *   execute: async ({ userId }, context) => {
 *     return await context.database.getUser(userId);
 *   }
 * });
 * ```
 * 
 * @example Conditional Tool
 * ```typescript
 * const adminTool = tool({
 *   description: 'Admin-only operation',
 *   inputSchema: z.object({
 *     action: z.string()
 *   }),
 *   enabled: (context) => context.user.isAdmin,
 *   execute: async ({ action }) => {
 *     // Admin operation
 *   }
 * });
 * ```
 */
export function tool<TParams extends z.ZodObject<any>>(config: {
  description: string;
  inputSchema: TParams;
  execute: (args: z.infer<TParams>, context?: any) => Promise<any> | any;
  enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
}): CoreTool {
  return {
    description: config.description,
    inputSchema: config.inputSchema,
    execute: config.execute,
    enabled: config.enabled,
  };
}

