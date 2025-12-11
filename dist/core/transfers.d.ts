/**
 * Agent Transfer System
 *
 * @module core/transfers
 * @description
 * Multi-agent coordination with context isolation for true agentic architecture.
 *
 * **Key Features**:
 * - Agent-to-agent transfers with isolated contexts
 * - Automatic transfer tool generation
 * - Clean message filtering (no history carryover)
 * - Query extraction for targeted delegation
 * - Performance-optimized for minimal overhead
 *
 * **Design Philosophy**:
 * Each transfer starts fresh with only the necessary context,
 * ensuring agents remain focused and performant. This approach
 * mimics human delegation patterns where you provide just enough
 * context for the specialist to complete their task.
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
import { Agent } from './agent';
import { z } from 'zod';
type CoreTool = {
    description?: string;
    inputSchema?: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
    enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
};
/**
 * Transfer result structure
 */
export interface TransferResult {
    agent: Agent<any, any>;
    reason: string;
    query?: string;
}
/**
 * Create transfer tools for an agent based on its subagents
 *
 * @param agent - The agent to create transfer tools for
 * @param subagents - Array of sub-agents this agent can transfer to
 * @returns Record of tool definitions
 */
export declare function createTransferTools(agent: Agent<any, any>, subagents: Agent<any, any>[]): Record<string, CoreTool>;
/**
 * Detect transfer from tool results - O(1) lookup for performance
 *
 * @param toolResults - Array of tool execution results
 * @param currentAgent - The current agent
 * @returns Transfer result if detected, null otherwise
 */
export declare function detectTransfer(toolResults: Array<{
    toolName: string;
    args: any;
    result: any;
}>, currentAgent: Agent<any, any>): TransferResult | null;
/**
 * Extract user query from input for isolated transfer
 *
 * @param input - Original input (string or messages)
 * @returns Clean user query string
 */
export declare function extractUserQuery(input: string | any[]): string;
/**
 * Create transfer context string for system message
 *
 * @param fromAgent - Agent transferring from
 * @param toAgent - Agent transferring to
 * @param reason - Reason for transfer
 * @returns Formatted transfer context
 */
export declare function createTransferContext(fromAgent: string, toAgent: string, reason?: string): string;
export {};
//# sourceMappingURL=transfers.d.ts.map