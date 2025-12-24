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
import type { Agent } from './agent';
import { type ModelMessage } from 'ai';
import { Usage } from './usage';
/** Constants for next step type values */
export declare const NextStepType: {
    readonly RUN_AGAIN: "next_step_run_again";
    readonly HANDOFF: "next_step_handoff";
    readonly FINAL_OUTPUT: "next_step_final_output";
    readonly INTERRUPTION: "next_step_interruption";
};
/**
 * Discriminated union for next step transitions
 * Enables type-safe state machine for agent execution
 */
export type NextStep = {
    type: typeof NextStepType.RUN_AGAIN;
} | {
    type: typeof NextStepType.HANDOFF;
    newAgent: Agent<any, any>;
    reason?: string;
    context?: string;
} | {
    type: typeof NextStepType.FINAL_OUTPUT;
    output: string;
} | {
    type: typeof NextStepType.INTERRUPTION;
    interruptions: any[];
};
/**
 * Individual step result with tool outcomes
 */
export interface StepResult {
    stepNumber: number;
    agentName: string;
    toolCalls: Array<{
        toolName: string;
        args: any;
        result: any;
    }>;
    text?: string;
    finishReason?: string;
    timestamp: number;
}
/**
 * Agent execution metrics for observability
 */
export interface AgentMetric {
    agentName: string;
    turns: number;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    toolCalls: number;
    duration: number;
    startTime: number;
    endTime?: number;
}
/**
 * Tracks tool usage per agent for reset logic
 */
export declare class AgentToolUseTracker {
    private agentToTools;
    addToolUse(agent: Agent<any, any>, toolNames: string[]): void;
    hasUsedTools(agent: Agent<any, any>): boolean;
    getToolsUsed(agent: Agent<any, any>): string[];
    toJSON(): Record<string, string[]>;
}
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
export declare class RunState<TContext = any, TAgent extends Agent<TContext, any> = Agent<any, any>> {
    currentAgent: TAgent;
    originalInput: string | ModelMessage[];
    messages: ModelMessage[];
    context: TContext;
    maxTurns: number;
    currentTurn: number;
    currentStep?: NextStep;
    steps: StepResult[];
    agentMetrics: Map<string, AgentMetric>;
    toolUseTracker: AgentToolUseTracker;
    usage: Usage;
    handoffChain: string[];
    private handoffChainSet;
    pendingInterruptions: any[];
    trace?: any;
    currentAgentSpan?: any;
    stepNumber: number;
    private startTime;
    items: any[];
    modelResponses: any[];
    agent: TAgent;
    constructor(agent: TAgent, input: string | ModelMessage[], context: TContext, maxTurns?: number);
    /**
     * Record a step in the execution
     */
    recordStep(step: StepResult): void;
    /**
     * Update agent metrics
     */
    updateAgentMetrics(agentName: string, tokens: {
        input: number;
        output: number;
        total: number;
    }, toolCallCount?: number): void;
    /**
     * Track a handoff to a new agent
     */
    trackHandoff(agentName: string): void;
    /**
     * Add an interruption (for HITL patterns)
     */
    addInterruption(interruption: any): void;
    /**
     * Check if there are pending interruptions
     */
    hasInterruptions(): boolean;
    /**
     * Clear interruptions after they've been handled
     */
    clearInterruptions(): void;
    /**
     * Get total execution duration
     */
    getDuration(): number;
    /**
     * Convert to a serializable format for persistence
     */
    toJSON(): any;
    /**
     * Check if we've exceeded max turns
     */
    isMaxTurnsExceeded(): boolean;
    /**
     * Increment turn counter
     */
    incrementTurn(): void;
}
/**
 * Result of a single turn/step execution
 * Used internally by the runner to manage state transitions
 */
export declare class SingleStepResult {
    originalInput: string | ModelMessage[];
    messages: ModelMessage[];
    preStepMessages: ModelMessage[];
    newMessages: ModelMessage[];
    nextStep: NextStep;
    stepResult?: StepResult | undefined;
    constructor(originalInput: string | ModelMessage[], messages: ModelMessage[], preStepMessages: ModelMessage[], newMessages: ModelMessage[], nextStep: NextStep, stepResult?: StepResult | undefined);
}
/**
 * @deprecated Use ModelMessage from 'ai' instead
 */
export type RunMessageItem = ModelMessage;
/**
 * @deprecated Use StepResult instead
 */
export interface RunToolCallItem {
    type: 'tool_call';
    toolName: string;
    args: any;
    result: any;
}
/**
 * @deprecated Use StepResult instead
 */
export interface RunToolResultItem {
    type: 'tool_result';
    toolName: string;
    result: any;
}
/**
 * @deprecated Use StepResult instead
 */
export interface RunHandoffCallItem {
    type: 'handoff_call';
    agentName: string;
    reason?: string;
}
/**
 * @deprecated Use StepResult instead
 */
export interface RunHandoffOutputItem {
    type: 'handoff_output';
    agentName: string;
    output: any;
}
/**
 * @deprecated Use StepResult instead
 */
export interface RunGuardrailItem {
    type: 'guardrail';
    name: string;
    passed: boolean;
    message?: string;
}
/**
 * @deprecated Union type for legacy compatibility
 */
export type RunItem = RunMessageItem | RunToolCallItem | RunToolResultItem | RunHandoffCallItem | RunHandoffOutputItem | RunGuardrailItem;
/**
 * @deprecated Use discriminated union types
 */
export type RunItemType = 'message' | 'tool_call' | 'tool_result' | 'handoff_call' | 'handoff_output' | 'guardrail';
/**
 * @deprecated Use response types from AI SDK
 */
export interface ModelResponse {
    text?: string;
    toolCalls?: Array<{
        toolName: string;
        args: any;
        toolCallId?: string;
    }>;
    finishReason?: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    response?: {
        messages: ModelMessage[];
    };
}
//# sourceMappingURL=runstate.d.ts.map