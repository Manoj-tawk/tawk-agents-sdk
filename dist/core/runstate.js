"use strict";
/**
 * Agent Run State Management
 *
 * @module core/runstate
 * @description
 * Production-grade state container for agent execution lifecycle.
 *
 * **Core Capabilities**:
 * - Stateful agent execution
 * - Interruption and resumption support
 * - Type-safe state transitions
 * - Message history management
 * - Agent context tracking
 * - Metrics aggregation
 *
 * **State Machine**:
 * - `next_step_run_again`: Continue execution
 * - `next_step_handoff`: Transfer to another agent
 * - `next_step_final_output`: Execution complete
 * - `next_step_interruption`: Pause for human input
 *
 * **Architecture**:
 * Provides a clean abstraction over agent execution state,
 * enabling features like pause/resume, debugging, and
 * complex multi-agent coordination patterns.
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleStepResult = exports.RunState = exports.AgentToolUseTracker = void 0;
const ai_1 = require("ai");
const usage_1 = require("./usage");
/**
 * Convert input messages to ModelMessage format.
 * Handles both UIMessage[] and ModelMessage[] inputs.
 *
 * @param messages - Input messages (UIMessage[] or ModelMessage[])
 * @returns ModelMessage[]
 */
function toModelMessages(messages) {
    // Check if this looks like UIMessage[] (has 'id' property typical of UIMessage)
    const isUIMessages = messages.length > 0 &&
        typeof messages[0] === 'object' &&
        messages[0] !== null &&
        'id' in messages[0];
    if (isUIMessages) {
        // Convert UIMessage[] to ModelMessage[]
        return (0, ai_1.convertToModelMessages)(messages);
    }
    // Already ModelMessage[] format - return as-is
    return messages;
}
/**
 * Tracks tool usage per agent for reset logic
 */
class AgentToolUseTracker {
    constructor() {
        this.agentToTools = new Map();
    }
    addToolUse(agent, toolNames) {
        this.agentToTools.set(agent, toolNames);
    }
    hasUsedTools(agent) {
        return this.agentToTools.has(agent);
    }
    getToolsUsed(agent) {
        return this.agentToTools.get(agent) || [];
    }
    toJSON() {
        return Object.fromEntries(Array.from(this.agentToTools.entries()).map(([agent, toolNames]) => [
            agent.name,
            toolNames,
        ]));
    }
}
exports.AgentToolUseTracker = AgentToolUseTracker;
/**
 * RunState - Encapsulates all state for an agent execution
 *
 * This is the core of the agentic architecture. It maintains:
 * - Current agent and execution context
 * - Message history and generated items
 * - Step tracking and metrics
 * - Interruption state for HITL patterns
 * - Tracing spans and metadata
 *
 * @template TContext - Type of context object
 * @template TAgent - Type of agent being executed
 */
class RunState {
    constructor(agent, input, context, maxTurns = 50) {
        // Step and metric tracking
        this.steps = [];
        this.agentMetrics = new Map();
        this.toolUseTracker = new AgentToolUseTracker();
        // Token usage tracking
        this.usage = new usage_1.Usage();
        // Handoff tracking
        this.handoffChain = [];
        this.handoffChainSet = new Set();
        // Interruption state for HITL
        this.pendingInterruptions = [];
        // Internal state
        this.stepNumber = 0;
        // Legacy compatibility properties
        this.items = [];
        this.modelResponses = [];
        this.currentAgent = agent;
        this.agent = agent; // Set alias
        this.originalInput = input;
        // Convert input to ModelMessage format - handles both UIMessage[] and ModelMessage[]
        this.messages = Array.isArray(input)
            ? toModelMessages(input)
            : [{ role: 'user', content: input }];
        this.context = context;
        this.maxTurns = maxTurns;
        this.currentTurn = 0;
        this.startTime = Date.now();
        // Initialize handoff chain with starting agent
        this.handoffChain.push(agent.name);
        this.handoffChainSet.add(agent.name);
    }
    /**
     * Record a step in the execution
     */
    recordStep(step) {
        this.steps.push(step);
        this.stepNumber++;
        // Update legacy items array
        for (const toolCall of step.toolCalls) {
            this.items.push({
                type: 'tool_call',
                toolName: toolCall.toolName,
                args: toolCall.args,
                result: toolCall.result,
            });
        }
        if (step.text) {
            this.items.push({
                role: 'assistant',
                content: step.text,
            });
        }
    }
    /**
     * Update agent metrics
     */
    updateAgentMetrics(agentName, tokens, toolCallCount = 0) {
        const existing = this.agentMetrics.get(agentName);
        if (existing) {
            existing.turns++;
            existing.tokens.input += tokens.input;
            existing.tokens.output += tokens.output;
            existing.tokens.total += tokens.total;
            existing.toolCalls += toolCallCount;
            existing.endTime = Date.now();
            existing.duration = existing.endTime - existing.startTime;
        }
        else {
            const now = Date.now();
            this.agentMetrics.set(agentName, {
                agentName,
                turns: 1,
                tokens: {
                    input: tokens.input,
                    output: tokens.output,
                    total: tokens.total,
                },
                toolCalls: toolCallCount,
                duration: 0,
                startTime: now,
            });
        }
    }
    /**
     * Track a handoff to a new agent
     */
    trackHandoff(agentName) {
        if (!this.handoffChainSet.has(agentName)) {
            this.handoffChain.push(agentName);
            this.handoffChainSet.add(agentName);
        }
    }
    /**
     * Add an interruption (for HITL patterns)
     */
    addInterruption(interruption) {
        this.pendingInterruptions.push(interruption);
    }
    /**
     * Check if there are pending interruptions
     */
    hasInterruptions() {
        return this.pendingInterruptions.length > 0;
    }
    /**
     * Clear interruptions after they've been handled
     */
    clearInterruptions() {
        this.pendingInterruptions = [];
    }
    /**
     * Get total execution duration
     */
    getDuration() {
        return Date.now() - this.startTime;
    }
    /**
     * Convert to a serializable format for persistence
     */
    toJSON() {
        return {
            currentAgent: this.currentAgent.name,
            originalInput: this.originalInput,
            messages: this.messages,
            context: this.context,
            maxTurns: this.maxTurns,
            currentTurn: this.currentTurn,
            currentStep: this.currentStep,
            steps: this.steps,
            agentMetrics: Array.from(this.agentMetrics.values()),
            toolUseTracker: this.toolUseTracker.toJSON(),
            usage: this.usage.toJSON(),
            handoffChain: this.handoffChain,
            pendingInterruptions: this.pendingInterruptions,
            stepNumber: this.stepNumber,
            duration: this.getDuration(),
        };
    }
    /**
     * Check if we've exceeded max turns
     */
    isMaxTurnsExceeded() {
        return this.currentTurn >= this.maxTurns;
    }
    /**
     * Increment turn counter
     */
    incrementTurn() {
        this.currentTurn++;
    }
}
exports.RunState = RunState;
/**
 * Result of a single turn/step execution
 * Used internally by the runner to manage state transitions
 */
class SingleStepResult {
    constructor(originalInput, messages, preStepMessages, newMessages, nextStep, stepResult) {
        this.originalInput = originalInput;
        this.messages = messages;
        this.preStepMessages = preStepMessages;
        this.newMessages = newMessages;
        this.nextStep = nextStep;
        this.stepResult = stepResult;
    }
}
exports.SingleStepResult = SingleStepResult;
//# sourceMappingURL=runstate.js.map