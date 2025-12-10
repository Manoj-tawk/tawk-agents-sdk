/**
 * Human-in-the-Loop (HITL) Support for True Agentic Architecture
 *
 * This module provides proper interruption and resumption patterns
 * for human approval workflows.
 *
 * @module hitl
 */
import { Agent, type RunOptions } from './agent';
import type { RunResult } from './runner';
import type { RunState } from './runstate';
import type { ModelMessage } from 'ai';
/**
 * Approval request from an agent
 */
export interface ApprovalRequest {
    type: 'tool_approval';
    toolName: string;
    args: any;
    reason?: string;
    agentName: string;
    stepNumber: number;
}
/**
 * Approval decision
 */
export interface ApprovalDecision {
    approve: boolean;
    reason?: string;
    modifiedArgs?: any;
}
/**
 * HITL result with interruption state
 */
export interface HITLResult {
    state: RunState;
    pendingApprovals: ApprovalRequest[];
    messages: ModelMessage[];
    steps: any[];
    metadata: any;
}
/**
 * Check if a run result requires human approval
 *
 * @param result - Run result to check
 * @returns True if there are pending approvals
 */
export declare function needsApproval(result: any): result is HITLResult;
/**
 * Get pending approvals from an interrupted run
 *
 * @param result - Interrupted run result
 * @returns Array of approval requests
 */
export declare function getPendingApprovals<TOutput = string>(result: RunResult<TOutput>): ApprovalRequest[];
/**
 * Resume an interrupted run after approvals
 *
 * This enables the HITL pattern:
 * 1. Agent requests approval (interrupts)
 * 2. Human reviews and approves/rejects
 * 3. Run resumes with approval decision
 *
 * @param state - Interrupted run state
 * @param approvals - Approval decisions
 * @param options - Run options
 * @returns Continued run result
 *
 * @example
 * ```typescript
 * // Initial run
 * const result = await run(agent, 'Delete all files');
 *
 * // Check if approval needed
 * if (needsApproval(result)) {
 *   const approvals = getPendingApprovals(result);
 *   console.log('Needs approval:', approvals);
 *
 *   // Get human decision
 *   const decision = await getHumanApproval(approvals[0]);
 *
 *   // Resume with decision
 *   const final = await resumeAfterApproval(
 *     result.state,
 *     [{ approve: decision.approve }]
 *   );
 *
 *   console.log('Final result:', final.finalOutput);
 * }
 * ```
 */
export declare function resumeAfterApproval<TContext = any, TOutput = string>(state: RunState<TContext, Agent<TContext, TOutput>>, approvals: ApprovalDecision[], options?: RunOptions<TContext>): Promise<RunResult<TOutput>>;
/**
 * Create an agent with approval requirements for specific tools
 *
 * @param config - Agent configuration
 * @param toolsRequiringApproval - Tool names that need approval
 * @returns Agent with HITL support
 *
 * @example
 * ```typescript
 * const agent = createAgentWithApprovals({
 *   name: 'FileManager',
 *   instructions: 'Manage files carefully',
 *   tools: { readFile, writeFile, deleteFile }
 * }, ['deleteFile', 'writeFile']);
 *
 * // deleteFile and writeFile will require human approval
 * ```
 */
export declare function createAgentWithApprovals<TContext = any, TOutput = string>(config: any, toolsRequiringApproval: string[]): Agent<TContext, TOutput>;
/**
 * Approval callback function type
 */
export type ApprovalCallback = (request: ApprovalRequest) => Promise<ApprovalDecision> | ApprovalDecision;
/**
 * Run an agent with automatic approval handling
 *
 * This wraps the run function to automatically handle approvals
 * via a callback function.
 *
 * @param agent - Agent to run
 * @param input - User input
 * @param onApprovalNeeded - Callback for approval requests
 * @param options - Run options
 * @returns Final run result (after all approvals)
 *
 * @example
 * ```typescript
 * const result = await runWithApprovalCallback(
 *   agent,
 *   'Delete all temp files',
 *   async (request) => {
 *     console.log(`Approve ${request.toolName}?`);
 *     const answer = await getUserInput();
 *     return { approve: answer === 'yes' };
 *   }
 * );
 * ```
 */
export declare function runWithApprovalCallback<TContext = any, TOutput = string>(agent: Agent<TContext, TOutput>, input: string | ModelMessage[], onApprovalNeeded: ApprovalCallback, options?: RunOptions<TContext>): Promise<RunResult<TOutput>>;
//# sourceMappingURL=hitl.d.ts.map