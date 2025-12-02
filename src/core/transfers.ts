/**
 * Transfer System - True Agentic Architecture
 * 
 * Implements agent-to-agent transfers with context isolation for optimal performance.
 * Each transfer starts fresh - no message history carried over.
 * 
 * @module transfers
 */

import { Agent } from './agent';
import { z } from 'zod';

// Type alias for tool definitions
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
  query?: string;  // Isolated query for the new agent
}

/**
 * Create transfer tools for an agent based on its subagents
 * 
 * @param agent - The agent to create transfer tools for
 * @param subagents - Array of sub-agents this agent can transfer to
 * @returns Record of tool definitions
 */
export function createTransferTools(
  agent: Agent<any, any>,
  subagents: Agent<any, any>[]
): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};
  
  for (const subagent of subagents) {
    const toolName = `transfer_to_${subagent.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    const description = subagent.transferDescription || subagent.handoffDescription 
      ? `Transfer to ${subagent.name}: ${subagent.transferDescription || subagent.handoffDescription}`
      : `Transfer to ${subagent.name} agent to handle the request`;
    
    tools[toolName] = {
      description,
      inputSchema: z.object({
        reason: z.string().describe('Reason for transferring to this agent'),
        query: z.string().optional().describe('Specific query for the agent (if different from original)')
      }),
      execute: async ({ reason, query }: { reason: string; query?: string }) => {
        // Return transfer marker with isolated context
        return {
          __transfer: true,
          agentName: subagent.name,
          reason,
          query: query || null  // Isolated query (or null to use original)
        };
      }
    };
  }
  
  return tools;
}

/**
 * Detect transfer from tool results - O(1) lookup for performance
 * 
 * @param toolResults - Array of tool execution results
 * @param currentAgent - The current agent
 * @returns Transfer result if detected, null otherwise
 */
export function detectTransfer(
  toolResults: Array<{ toolName: string; args: any; result: any }>,
  currentAgent: Agent<any, any>
): TransferResult | null {
  // Early exit if no tool results
  if (toolResults.length === 0) return null;
  
  // Create agent lookup map for O(1) resolution
  const subagents = currentAgent.subagents || currentAgent.handoffs || [];
  const subagentMap = new Map<string, Agent<any, any>>();
  for (const agent of subagents) {
    subagentMap.set(agent.name, agent);
  }
  
  // Check all tool results for transfer marker
  for (const tr of toolResults) {
    if (tr.result?.__transfer) {
      const agentName = tr.result.agentName;
      const targetAgent = subagentMap.get(agentName);
      
      if (!targetAgent) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️  Transfer target agent "${agentName}" not found`);
        }
        return null;
      }
      
      return {
        agent: targetAgent,
        reason: tr.result.reason,
        query: tr.result.query  // Isolated query for fresh start
      };
    }
  }
  
  return null;
}

/**
 * Extract user query from input for isolated transfer
 * 
 * @param input - Original input (string or messages)
 * @returns Clean user query string
 */
export function extractUserQuery(input: string | any[]): string {
  if (typeof input === 'string') {
    return input;
  }
  
  // Find the last user message
  const userMessages = input.filter((m: any) => m.role === 'user');
  if (userMessages.length > 0) {
    const lastUser = userMessages[userMessages.length - 1];
    return typeof lastUser.content === 'string' 
      ? lastUser.content 
      : lastUser.content[0]?.text || '';
  }
  
  return '';
}

/**
 * Create transfer context string for system message
 * 
 * @param fromAgent - Agent transferring from
 * @param toAgent - Agent transferring to  
 * @param reason - Reason for transfer
 * @returns Formatted transfer context
 */
export function createTransferContext(fromAgent: string, toAgent: string, reason?: string): string {
  return `[Transfer from ${fromAgent}] You are now ${toAgent}. ${reason ? `Reason: ${reason}` : ''}`;
}

