/**
 * Handoff Extensions
 *
 * Pre-built handoff filters and utilities for multi-agent workflows.
 *
 * @module extensions/handoff
 */
import type { HandoffInputData } from './index';
/**
 * Remove all tools from handoff input
 * Useful when you don't want the next agent to see previous tool calls
 */
export declare function removeAllTools(input: HandoffInputData): HandoffInputData;
/**
 * Keep only the last N messages
 */
export declare function keepLastMessages(limit: number): (input: HandoffInputData) => HandoffInputData;
/**
 * Keep only the last message
 */
export declare function keepLastMessage(): (input: HandoffInputData) => HandoffInputData;
/**
 * Keep only messages (remove all items)
 */
export declare function keepMessagesOnly(input: HandoffInputData): HandoffInputData;
/**
 * Create a handoff prompt describing available handoffs
 */
export declare function createHandoffPrompt(agents: Array<{
    name: string;
    handoffDescription?: string;
}>): string;
//# sourceMappingURL=filters.d.ts.map