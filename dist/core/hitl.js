"use strict";
/**
 * Human-in-the-Loop (HITL) Support for True Agentic Architecture
 *
 * This module provides proper interruption and resumption patterns
 * for human approval workflows.
 *
 * @module hitl
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsApproval = needsApproval;
exports.getPendingApprovals = getPendingApprovals;
exports.resumeAfterApproval = resumeAfterApproval;
exports.createAgentWithApprovals = createAgentWithApprovals;
exports.runWithApprovalCallback = runWithApprovalCallback;
const agent_1 = require("./agent");
const runner_1 = require("./runner");
/**
 * Check if a run result requires human approval
 *
 * @param result - Run result to check
 * @returns True if there are pending approvals
 */
function needsApproval(result) {
    return result.state?.hasInterruptions() || false;
}
/**
 * Get pending approvals from an interrupted run
 *
 * @param result - Interrupted run result
 * @returns Array of approval requests
 */
function getPendingApprovals(result) {
    if (!needsApproval(result)) {
        return [];
    }
    return result.state.pendingInterruptions;
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
async function resumeAfterApproval(state, approvals, options = {}) {
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
    const allApproved = state.pendingInterruptions.every((i) => i.approved !== false);
    if (allApproved) {
        state.clearInterruptions();
    }
    // Resume execution from the state
    // The agent will re-evaluate and continue
    state.currentStep = { type: 'next_step_run_again' };
    const runner = new runner_1.AgenticRunner(options);
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
function createAgentWithApprovals(config, toolsRequiringApproval) {
    const tools = config.tools || {};
    const approvalSet = new Set(toolsRequiringApproval);
    // Wrap tools that require approval
    const wrappedTools = {};
    for (const [name, tool] of Object.entries(tools)) {
        if (approvalSet.has(name)) {
            wrappedTools[name] = {
                ...tool,
                enabled: async (context) => {
                    // Check if this tool has been approved
                    const approved = context._approvedTools?.has(name);
                    return approved === true;
                },
            };
        }
        else {
            wrappedTools[name] = tool;
        }
    }
    return new agent_1.Agent({
        ...config,
        tools: wrappedTools,
    });
}
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
async function runWithApprovalCallback(agent, input, onApprovalNeeded, options = {}) {
    const runner = new runner_1.AgenticRunner(options);
    let result = await runner.execute(agent, input, options);
    // Loop until no more approvals needed
    while (needsApproval(result)) {
        const approvals = getPendingApprovals(result);
        const decisions = [];
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
//# sourceMappingURL=hitl.js.map