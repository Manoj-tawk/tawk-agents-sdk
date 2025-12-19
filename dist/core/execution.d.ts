/**
 * Agent Execution Engine
 *
 * @module core/execution
 * @description
 * Core execution logic for agent-driven autonomous behavior.
 *
 * **Core Capabilities**:
 * - Parallel tool execution for optimal performance
 * - Agent-controlled decision making
 * - Autonomous state transitions
 * - Multi-agent transfer coordination
 * - Comprehensive error handling
 *
 * **Architecture**:
 * This module processes each execution step, handling tool calls,
 * agent transfers, and state management. It maintains proper
 * separation of concerns between execution logic and orchestration.
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
import type { Agent, CoreTool, RunContextWrapper } from './agent';
import type { ModelMessage, GenerateTextResult, ToolSet, FinishReason } from 'ai';
import type { RunState, NextStep } from './runstate';
import { SingleStepResult } from './runstate';
/**
 * Tool call extracted from model response
 */
export interface ExtractedToolCall {
    toolName: string;
    args: Record<string, unknown>;
    toolCallId: string;
}
/**
 * Handoff/transfer request extracted from model response
 */
export interface HandoffRequest {
    agentName: string;
    reason: string;
    context?: string;
}
/**
 * Processed model response with categorized actions
 */
export interface ProcessedResponse {
    /** Generated text from the model */
    text: string;
    /** Reason the model stopped generating */
    finishReason: FinishReason;
    /** Regular tool calls (non-transfer) */
    toolCalls: ExtractedToolCall[];
    /** Agent transfer/handoff requests */
    handoffRequests: HandoffRequest[];
    /** Messages to add to conversation history */
    newMessages: ModelMessage[];
}
/**
 * Tool execution result
 */
export interface ToolExecutionResult {
    toolName: string;
    args: any;
    result: any;
    error?: Error;
    duration: number;
    needsApproval?: boolean;
    approved?: boolean;
}
/**
 * Execute all tool calls in parallel (CRITICAL for agentic behavior)
 *
 * This is the key difference from sequential execution:
 * - All tools run simultaneously using Promise.all
 * - No waiting for one tool to finish before starting another
 * - Agents can make parallel decisions
 *
 * @param tools - Dictionary of available tools
 * @param toolCalls - Tool calls to execute
 * @param contextWrapper - Execution context
 * @returns Array of tool execution results
 */
export declare function executeToolsInParallel<TContext = any>(tools: Record<string, CoreTool>, toolCalls: Array<{
    toolName: string;
    args: any;
    toolCallId?: string;
}>, contextWrapper: RunContextWrapper<TContext>): Promise<ToolExecutionResult[]>;
/**
 * Process model response and categorize actions
 *
 * Separates tool calls, handoff requests, and regular messages
 * for autonomous decision making.
 *
 * @param response - The result from generateText
 * @returns Processed response with categorized tool calls and messages
 */
export declare function processModelResponse<T extends ToolSet = ToolSet>(response: GenerateTextResult<T, unknown>): ProcessedResponse;
/**
 * Determine next step based on agent's decision (NOT SDK decision)
 *
 * This is critical for true agentic behavior:
 * - Agent decides if it needs to continue
 * - Agent decides if it needs to handoff
 * - Agent decides if it has a final output
 * - Agent decides if it needs human approval
 *
 * @param agent - Current agent
 * @param processed - Processed response
 * @param toolResults - Tool execution results
 * @param context - Execution context
 * @returns Next step decision
 */
export declare function determineNextStep<TContext = any>(agent: Agent<TContext, any>, processed: ProcessedResponse, toolResults: ToolExecutionResult[], context: TContext): Promise<NextStep>;
/**
 * Execute a single agent step with autonomous decision making
 *
 * @param agent - Current agent
 * @param state - Run state
 * @param contextWrapper - Execution context wrapper
 * @param modelResponse - Response from generateText
 * @returns Single step result with next step decision
 */
export declare function executeSingleStep<TContext = any>(agent: Agent<TContext, any>, state: RunState<TContext, Agent<TContext, any>>, contextWrapper: RunContextWrapper<TContext>, modelResponse: GenerateTextResult<ToolSet, unknown>): Promise<SingleStepResult>;
//# sourceMappingURL=execution.d.ts.map