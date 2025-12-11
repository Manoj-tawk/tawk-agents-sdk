/**
 * Enhanced Types for Full Feature Support
 *
 * Includes: Error types, Background results, Tracing, MCP, Human-in-the-loop
 */
import { z } from 'zod';
import type { ModelMessage } from 'ai';
export type Message = ModelMessage;
/**
 * Background result - tool execution that continues in background
 * Useful for long-running operations that don't block agent flow
 */
export declare class BackgroundResult<T> {
    promise: Promise<T>;
    readonly isBackground = true;
    constructor(promise: Promise<T>);
}
export declare function backgroundResult<T>(promise: Promise<T>): BackgroundResult<T>;
export declare function isBackgroundResult(value: any): value is BackgroundResult<any>;
export declare class MaxTurnsExceededError extends Error {
    constructor(maxTurns: number);
}
export declare class GuardrailTripwireTriggered extends Error {
    guardrailName: string;
    metadata?: Record<string, any> | undefined;
    constructor(guardrailName: string, message: string, metadata?: Record<string, any> | undefined);
}
export declare class ToolExecutionError extends Error {
    toolName: string;
    originalError?: Error | undefined;
    constructor(toolName: string, message: string, originalError?: Error | undefined);
}
export declare class HandoffError extends Error {
    fromAgent: string;
    toAgent: string;
    originalError?: Error | undefined;
    constructor(fromAgent: string, toAgent: string, message: string, originalError?: Error | undefined);
}
export declare class ApprovalRequiredError extends Error {
    toolName: string;
    args: any;
    approvalToken: string;
    constructor(toolName: string, args: any, approvalToken: string);
}
export interface TraceOptions {
    traceId?: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
}
export interface TraceEvent {
    type: 'agent-start' | 'agent-end' | 'tool-start' | 'tool-end' | 'handoff' | 'error' | 'guardrail';
    timestamp: number;
    data: any;
}
export type TraceCallback = (event: TraceEvent) => void | Promise<void>;
export interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    tools?: string[];
}
export interface MCPTool {
    name: string;
    serverName: string;
    description: string;
    inputSchema: any;
}
export interface MCPToolCall {
    toolName: string;
    serverName: string;
    args: any;
    result?: any;
}
export interface ApprovalConfig {
    /**
     * Tools that require approval before execution
     */
    requiredForTools?: string[];
    /**
     * Function to request approval
     */
    requestApproval: (tool: string, args: any) => Promise<ApprovalResponse>;
    /**
     * Timeout for approval (ms)
     */
    timeout?: number;
}
export interface ApprovalResponse {
    approved: boolean;
    reason?: string;
    modifiedArgs?: any;
}
export interface PendingApproval {
    toolName: string;
    args: any;
    approvalToken: string;
    requestedAt: number;
    status: 'pending' | 'approved' | 'rejected' | 'timeout';
}
export interface StepMetadata {
    duration?: number;
    tokens?: {
        total: number;
        prompt: number;
        completion: number;
    };
    timestamp?: number;
    agentName?: string;
    handoffInfo?: {
        fromAgent: string;
        toAgent: string;
        reason?: string;
    };
}
export interface RunMetadata {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
    duration?: number;
    agentName?: string;
    handoffCount?: number;
    totalSteps?: number;
    toolCallsCount?: number;
    guardrailsRan?: number;
    traceId?: string;
}
export interface StructuredOutputConfig<T> {
    schema: z.ZodSchema<T>;
    /**
     * How to handle validation errors
     */
    onValidationError?: 'throw' | 'retry' | 'ignore';
    /**
     * Maximum retry attempts for validation
     */
    maxRetries?: number;
}
export interface EnhancedAgentConfig<TContext = any, TOutput = string> {
    name: string;
    instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
    model?: any;
    tools?: Record<string, ToolDefinition>;
    handoffs?: Agent<TContext, any>[];
    guardrails?: Guardrail<TContext>[];
    outputSchema?: z.ZodSchema<TOutput>;
    structuredOutput?: StructuredOutputConfig<TOutput>;
    maxSteps?: number;
    maxTurns?: number;
    modelSettings?: ModelSettings;
    onStepFinish?: (step: StepResult) => void | Promise<void>;
    shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
    mcpServers?: MCPServerConfig[];
    approvalConfig?: ApprovalConfig;
    tracing?: {
        enabled: boolean;
        callback?: TraceCallback;
        metadata?: Record<string, any>;
    };
}
export interface ModelSettings {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}
export interface ToolDefinition {
    description: string;
    parameters?: z.ZodSchema<any>;
    inputSchema?: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any | BackgroundResult<any>;
    requiresApproval?: boolean;
    mcpServer?: string;
    /**
     * Optional: Control whether this tool is available for the current execution context
     * Can be a boolean or a function that returns a boolean (sync or async)
     * If false or function returns false, the tool will not be available to the model
     *
     * @example
     * // Static enabled/disabled
     * enabled: true
     *
     * @example
     * // Dynamic based on context
     * enabled: (ctx) => ctx.user.isPremium
     *
     * @example
     * // Async check (e.g., database lookup)
     * enabled: async (ctx) => {
     *   const user = await getUser(ctx.userId);
     *   return user.tier === 'premium';
     * }
     */
    enabled?: boolean | ((context: RunContextWrapper<any>) => boolean | Promise<boolean>);
}
export interface RunContextWrapper<TContext> {
    context: TContext;
    agent: Agent<TContext, any>;
    messages: Message[];
    traceId?: string;
}
export interface Guardrail<TContext = any> {
    name: string;
    type: 'input' | 'output';
    validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}
export interface GuardrailResult {
    passed: boolean;
    message?: string;
    metadata?: Record<string, any>;
}
export interface StepResult {
    stepNumber: number;
    agentName: string;
    toolCalls: ToolCall[];
    text?: string;
    finishReason?: string;
    duration?: number;
    tokens?: {
        total: number;
        prompt: number;
        completion: number;
    };
    metadata?: StepMetadata;
}
export interface ToolCall {
    toolName: string;
    args: any;
    result?: any;
    id?: string;
    requiresApproval?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
}
export interface Agent<TContext = any, TOutput = string> {
    readonly name: string;
    getInstructions(context: RunContextWrapper<TContext>): Promise<string>;
    clone(overrides: Partial<EnhancedAgentConfig<TContext, TOutput>>): Agent<TContext, TOutput>;
    asTool(options?: {
        toolName?: string;
        toolDescription?: string;
    }): ToolDefinition;
    readonly _model: any;
    readonly _tools: Record<string, ToolDefinition>;
    readonly _guardrails: Guardrail<TContext>[];
    readonly _handoffs: Agent<TContext, any>[];
    readonly _outputSchema?: z.ZodSchema<TOutput>;
    readonly _maxSteps: number;
    readonly _modelSettings?: ModelSettings;
    readonly _onStepFinish?: (step: StepResult) => void | Promise<void>;
    readonly _shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
    readonly _mcpServers?: MCPServerConfig[];
    readonly _approvalConfig?: ApprovalConfig;
    readonly _tracing?: EnhancedAgentConfig<TContext, TOutput>['tracing'];
}
export interface RunOptions<TContext = any> {
    context?: TContext;
    session?: Session<TContext>;
    maxTurns?: number;
    tracing?: TraceOptions;
    onTrace?: TraceCallback;
    approvals?: Map<string, ApprovalResponse>;
    metadata?: Record<string, any>;
}
export interface RunResult<TOutput = string> {
    finalOutput: TOutput;
    messages: Message[];
    steps: StepResult[];
    state?: RunState;
    metadata: RunMetadata;
    pendingApprovals?: PendingApproval[];
}
export interface RunState {
    agent: Agent<any, any>;
    messages: Message[];
    context: any;
    stepNumber: number;
    pendingApprovals?: PendingApproval[];
    traceId?: string;
}
export interface Session<_TContext = any> {
    id: string;
    getHistory(): Promise<Message[]>;
    addMessages(messages: Message[]): Promise<void>;
    clear(): Promise<void>;
    getMetadata(): Promise<Record<string, any>>;
    updateMetadata(metadata: Record<string, any>): Promise<void>;
}
export interface StreamResult<TOutput = string> {
    textStream: AsyncIterable<string>;
    fullStream: AsyncIterable<StreamEvent>;
    completed: Promise<RunResult<TOutput>>;
}
export interface StreamEvent {
    type: 'text-delta' | 'tool-call' | 'tool-result' | 'step-finish' | 'finish' | 'error' | 'handoff' | 'approval-required' | 'trace';
    textDelta?: string;
    toolCall?: ToolCall;
    toolResult?: any;
    step?: StepResult;
    error?: Error;
    handoff?: {
        fromAgent: string;
        toAgent: string;
        reason?: string;
    };
    approval?: PendingApproval;
    trace?: TraceEvent;
}
//# sourceMappingURL=types.d.ts.map