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
import { AgenticRunner } from './runner';
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
export interface HITLResult<TOutput = string> {
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
export function needsApproval<TOutput = string>(
  result: any
): result is HITLResult<TOutput> {
  return result.state?.hasInterruptions() || false;
}

/**
 * Get pending approvals from an interrupted run
 * 
 * @param result - Interrupted run result
 * @returns Array of approval requests
 */
export function getPendingApprovals<TOutput = string>(
  result: RunResult<TOutput>
): ApprovalRequest[] {
  if (!needsApproval(result)) {
    return [];
  }

  return result.state.pendingInterruptions as ApprovalRequest[];
}

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
export async function resumeAfterApproval<TContext = any, TOutput = string>(
  state: RunState<TContext, Agent<TContext, TOutput>>,
  approvals: ApprovalDecision[],
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  // Update state with approval decisions
  for (let i = 0; i < Math.min(state.pendingInterruptions.length, approvals.length); i++) {
    const interruption = state.pendingInterruptions[i];
    const decision = approvals[i];

    // Update the interruption with approval status
    interruption.approved = decision.approve;
    interruption.reason = decision.reason;

    if (decision.modifiedArgs) {
      interruption.args = decision.modifiedArgs;
    }
  }

  // Clear interruptions if all approved
  const allApproved = state.pendingInterruptions.every((i: any) => i.approved !== false);
  if (allApproved) {
    state.clearInterruptions();
  }

  // Resume execution from the state
  // The agent will re-evaluate and continue
  state.currentStep = { type: 'next_step_run_again' };

  const runner = new AgenticRunner<TContext, TOutput>(options);
  return await runner.execute(state.currentAgent, state.messages, options);
}

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
export function createAgentWithApprovals<TContext = any, TOutput = string>(
  config: any,
  toolsRequiringApproval: string[]
): Agent<TContext, TOutput> {
  const tools = config.tools || {};
  const approvalSet = new Set(toolsRequiringApproval);

  // Wrap tools that require approval
  const wrappedTools: Record<string, any> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (approvalSet.has(name)) {
      wrappedTools[name] = {
        ...(tool as any),
        enabled: async (context: any) => {
          // Check if this tool has been approved
          const approved = (context as any)._approvedTools?.has(name);
          return approved === true;
        },
      };
    } else {
      wrappedTools[name] = tool;
    }
  }

  return new Agent({
    ...config,
    tools: wrappedTools,
  });
}

/**
 * Approval callback function type
 */
export type ApprovalCallback = (
  request: ApprovalRequest
) => Promise<ApprovalDecision> | ApprovalDecision;

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
export async function runWithApprovalCallback<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  onApprovalNeeded: ApprovalCallback,
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  const runner = new AgenticRunner<TContext, TOutput>(options);
  let result = await runner.execute(agent, input, options);

  // Loop until no more approvals needed
  while (needsApproval(result)) {
    const approvals = getPendingApprovals(result);
    const decisions: ApprovalDecision[] = [];

    // Get approval for each request
    for (const request of approvals) {
      const decision = await onApprovalNeeded(request);
      decisions.push(decision);
    }

    // Resume with approvals
    result = await resumeAfterApproval(result.state, decisions, options);
  }

  return result;
}

