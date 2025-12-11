/**
 * Handoff System
 *
 * Implements structured agent-to-agent handoffs for multi-agent workflows.
 * Handoffs allow one agent to delegate tasks to another specialized agent.
 *
 * @module handoff
 */
import { Agent } from '../core/agent';
import type { RunContextWrapper } from '../core/agent';
/**
 * Data passed to handoff input filters
 */
export interface HandoffInputData {
    /**
     * The original input history
     */
    inputHistory: any[];
    /**
     * Items generated before the handoff
     */
    preHandoffItems: any[];
    /**
     * New items generated during this turn
     */
    newItems: any[];
    /**
     * The run context
     */
    runContext?: RunContextWrapper<any>;
}
/**
 * Function that filters inputs passed to the next agent
 */
export type HandoffInputFilter = (input: HandoffInputData) => HandoffInputData;
/**
 * Function that determines if handoff is enabled
 */
export type HandoffEnabledFunction<TContext = any> = (args: {
    runContext: RunContextWrapper<TContext>;
    agent: Agent<any, any>;
}) => Promise<boolean>;
/**
 * Handoff class - represents delegation from one agent to another
 */
export declare class Handoff<TContext = any, TOutput = string> {
    /**
     * Name of the tool that represents this handoff
     */
    toolName: string;
    /**
     * Description of when to use this handoff
     */
    toolDescription: string;
    /**
     * The agent being handed off to
     */
    agent: Agent<TContext, TOutput>;
    /**
     * Name of the agent being handed off to
     */
    agentName: string;
    /**
     * Function called when handoff is invoked
     */
    onInvokeHandoff: (context: RunContextWrapper<TContext>, args: string) => Promise<Agent<TContext, TOutput>> | Agent<TContext, TOutput>;
    /**
     * Optional filter for inputs passed to next agent
     */
    inputFilter?: HandoffInputFilter;
    /**
     * Function that determines if this handoff is enabled
     */
    isEnabled: HandoffEnabledFunction<TContext>;
    constructor(agent: Agent<TContext, TOutput>, onInvokeHandoff: (context: RunContextWrapper<TContext>, args: string) => Promise<Agent<TContext, TOutput>> | Agent<TContext, TOutput>);
    /**
     * Get transfer message for tool output
     */
    getTransferMessage(): string;
}
/**
 * Create a handoff from an agent
 */
export declare function handoff<TContext = any, TOutput = string>(agent: Agent<TContext, TOutput>, config?: {
    toolNameOverride?: string;
    toolDescriptionOverride?: string;
    inputFilter?: HandoffInputFilter;
    isEnabled?: boolean | HandoffEnabledFunction<TContext>;
}): Handoff<TContext, TOutput>;
/**
 * Get handoff from agent or handoff instance
 */
export declare function getHandoff<TContext, TOutput>(agent: Agent<TContext, TOutput> | Handoff<TContext, TOutput>): Handoff<TContext, TOutput>;
//# sourceMappingURL=index.d.ts.map