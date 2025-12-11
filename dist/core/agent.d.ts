/**
 * Core Agent Implementation
 *
 * @module core/agent
 * @description
 * Provides the core Agent class and execution functions for the Tawk Agents SDK.
 * Built on Vercel AI SDK for maximum flexibility and multi-provider support.
 *
 * **Features**:
 * - Agent orchestration with instructions and tools
 * - Multi-agent coordination via subagents (transfers)
 * - Context management and dependency injection
 * - Automatic conversation history with Sessions
 * - Input/output guardrails for safety
 * - Real-time streaming support
 * - Multi-provider LLM support (OpenAI, Anthropic, Google, Mistral, etc.)
 * - Comprehensive error handling
 * - Production-ready architecture
 *
 * @author Tawk.to
 * @license MIT
 * @version 2.0.0
 */
import { type ModelMessage, type LanguageModel } from 'ai';
import { z } from 'zod';
import { Usage } from './usage';
type ToolDefinition = {
    description?: string;
    inputSchema?: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
    enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
};
export type CoreTool = ToolDefinition;
import { AgentHooks } from '../lifecycle';
/**
 * Configuration for creating an Agent instance.
 *
 * @template TContext - Type of context object passed to tools and guardrails
 * @template TOutput - Type of the agent's output (defaults to string)
 *
 * @property {string} name - Unique identifier for the agent (used in logging and tracing)
 * @property {string | Function} instructions - System prompt or function that returns instructions dynamically
 * @property {LanguageModel} [model] - AI model to use (defaults to global default model)
 * @property {Record<string, CoreTool>} [tools] - Dictionary of tools the agent can use
 * @property {Agent[]} [subagents] - List of sub-agents this agent can transfer to
 * @property {string} [transferDescription] - Description of when to transfer to this agent
 * @property {Guardrail[]} [guardrails] - Input/output validation rules
 * @property {z.ZodSchema} [outputSchema] - Schema for structured output parsing
 * @property {z.ZodSchema} [outputType] - Alias for outputSchema (for backward compatibility)
 * @property {number} [maxSteps] - Maximum number of steps before stopping (default: 10)
 * @property {Object} [modelSettings] - Model generation inputSchema
 * @property {number} [modelSettings.temperature] - Sampling temperature (0-2)
 * @property {number} [modelSettings.topP] - Nucleus sampling parameter
 * @property {number} [modelSettings.maxTokens] - Maximum tokens to generate
 * @property {number} [modelSettings.presencePenalty] - Presence penalty (-2 to 2)
 * @property {number} [modelSettings.frequencyPenalty] - Frequency penalty (-2 to 2)
 * @property {Function} [onStepFinish] - Callback invoked after each step completes
 * @property {Function} [shouldFinish] - Custom function to determine if agent should stop
 */
export interface AgentConfig<TContext = any, TOutput = string> {
    name: string;
    instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
    model?: LanguageModel;
    tools?: Record<string, CoreTool>;
    subagents?: Agent<TContext, any>[];
    transferDescription?: string;
    handoffs?: Agent<TContext, any>[];
    handoffDescription?: string;
    guardrails?: Guardrail<TContext>[];
    outputSchema?: z.ZodSchema<TOutput>;
    outputType?: z.ZodSchema<TOutput>;
    maxSteps?: number;
    modelSettings?: {
        temperature?: number;
        topP?: number;
        maxTokens?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
    };
    onStepFinish?: (step: StepResult) => void | Promise<void>;
    shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
    useTOON?: boolean;
}
/**
 * Options for running an agent.
 *
 * @template TContext - Type of context object passed to tools
 *
 * @property {TContext} [context] - Request-scoped context available to all tools
 * @property {Session} [session] - Session for maintaining conversation history
 * @property {boolean} [stream] - Whether to stream responses (use runStream() instead)
 * @property {Function} [sessionInputCallback] - Transform messages before agent execution
 * @property {number} [maxTurns] - Maximum conversation turns before stopping (default: 50)
 */
export interface RunOptions<TContext = any> {
    context?: TContext;
    session?: Session<TContext>;
    stream?: boolean;
    sessionInputCallback?: (history: ModelMessage[], newInput: ModelMessage[]) => ModelMessage[];
    maxTurns?: number;
}
/**
 * Result of running an agent.
 *
 * @template TOutput - Type of the final output
 *
 * @property {TOutput} finalOutput - The agent's final response/output
 * @property {ModelMessage[]} messages - Complete conversation history including all turns
 * @property {StepResult[]} steps - Individual steps taken during execution
 * @property {RunState} [state] - Current execution state (for resuming)
 * @property {Object} metadata - Execution metadata and metrics
 * @property {number} [metadata.totalTokens] - Total tokens used
 * @property {number} [metadata.promptTokens] - Tokens in prompts
 * @property {number} [metadata.completionTokens] - Tokens in completions
 * @property {string} [metadata.finishReason] - Why execution finished ('stop', 'length', etc.)
 * @property {number} [metadata.totalToolCalls] - Total number of tool calls made
 * @property {string[]} [metadata.handoffChain] - Chain of agent names involved in handoffs
 * @property {AgentMetric[]} [metadata.agentMetrics] - Performance metrics per agent
 * @property {string[]} [metadata.raceParticipants] - Agent names in race execution
 * @property {string[]} [metadata.raceWinners] - Winning agent names from race
 */
export interface RunResult<TOutput = string> {
    finalOutput: TOutput;
    messages: ModelMessage[];
    steps: StepResult[];
    state?: RunState;
    metadata: {
        totalTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
        finishReason?: string;
        totalToolCalls?: number;
        handoffChain?: string[];
        agentMetrics?: AgentMetric[];
        raceParticipants?: string[];
        raceWinners?: string[];
    };
}
/**
 * Performance metrics for a single agent during execution.
 *
 * @property {string} agentName - Name of the agent
 * @property {number} turns - Number of turns this agent executed
 * @property {Object} tokens - Token usage breakdown
 * @property {number} tokens.input - Input tokens used
 * @property {number} tokens.output - Output tokens generated
 * @property {number} tokens.total - Total tokens used
 * @property {number} toolCalls - Number of tool calls made
 * @property {number} duration - Execution duration in milliseconds
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
}
/**
 * Result of streaming an agent execution.
 *
 * @template TOutput - Type of the final output
 *
 * @property {AsyncIterable<string>} textStream - Stream of text chunks as they're generated
 * @property {AsyncIterable<StreamChunk>} fullStream - Stream of all events (text, tool calls, etc.)
 * @property {Promise<RunResult<TOutput>>} completed - Promise that resolves with final result
 */
export interface StreamResult<TOutput = string> {
    textStream: AsyncIterable<string>;
    fullStream: AsyncIterable<StreamChunk>;
    completed: Promise<RunResult<TOutput>>;
}
/**
 * A single chunk in the streaming response.
 *
 * @property {string} type - Type of chunk: 'text-delta', 'tool-call', 'tool-result', 'step-finish', or 'finish'
 * @property {string} [textDelta] - Text chunk (for 'text-delta' type)
 * @property {Object} [toolCall] - Tool call information (for 'tool-call' type)
 * @property {string} toolCall.toolName - Name of the tool being called
 * @property {any} toolCall.args - Arguments passed to the tool
 * @property {Object} [toolResult] - Tool execution result (for 'tool-result' type)
 * @property {string} toolResult.toolName - Name of the tool that executed
 * @property {any} toolResult.result - Result returned by the tool
 * @property {StepResult} [step] - Step result (for 'step-finish' type)
 */
export interface StreamChunk {
    type: 'text-delta' | 'tool-call' | 'tool-result' | 'step-finish' | 'finish';
    textDelta?: string;
    toolCall?: {
        toolName: string;
        args: any;
    };
    toolResult?: {
        toolName: string;
        result: any;
    };
    step?: StepResult;
}
/**
 * Result of a single agent execution step.
 *
 * @property {number} stepNumber - Sequential step number (1-indexed)
 * @property {Array} toolCalls - Tools called during this step
 * @property {string} toolCalls[].toolName - Name of the tool
 * @property {any} toolCalls[].args - Arguments passed to the tool
 * @property {any} toolCalls[].result - Result returned by the tool
 * @property {string} [text] - Text generated in this step
 * @property {string} [finishReason] - Reason step finished ('stop', 'tool-calls', 'length', etc.)
 */
export interface StepResult {
    stepNumber: number;
    toolCalls: Array<{
        toolName: string;
        args: any;
        result: any;
    }>;
    text?: string;
    finishReason?: string;
}
/**
 * Execution state for resuming a paused agent run (e.g., for human-in-the-loop).
 *
 * @property {Agent} agent - The agent being executed
 * @property {ModelMessage[]} messages - Current conversation messages
 * @property {any} context - Execution context
 * @property {number} stepNumber - Current step number
 * @property {Array} [pendingApprovals] - Pending tool approval requests
 * @property {string} pendingApprovals[].toolName - Name of tool awaiting approval
 * @property {any} pendingApprovals[].args - Arguments for the tool call
 * @property {boolean} pendingApprovals[].approved - Whether approval was granted
 */
export interface RunState {
    agent: Agent<any, any>;
    messages: ModelMessage[];
    context: any;
    stepNumber: number;
    pendingApprovals?: Array<{
        toolName: string;
        args: any;
        approved: boolean;
    }>;
}
/**
 * Context wrapper passed to tools and guardrails during execution.
 *
 * @template TContext - Type of the context object
 *
 * @property {TContext} context - Request-scoped context (dependency injection)
 * @property {Agent} agent - The agent currently executing
 * @property {ModelMessage[]} messages - Current conversation history
 * @property {Usage} usage - Token usage tracker for the current run
 */
export interface RunContextWrapper<TContext> {
    context: TContext;
    agent: Agent<TContext, any>;
    messages: ModelMessage[];
    usage: Usage;
}
export interface Session<_TContextType = any> {
    /**
     * Unique identifier for this session
     */
    id: string;
    /**
     * Load conversation history from storage
     */
    getHistory(): Promise<ModelMessage[]>;
    /**
     * Add new messages to the session
     */
    addMessages(messages: ModelMessage[]): Promise<void>;
    /**
     * Clear session history
     */
    clear(): Promise<void>;
    /**
     * Get session metadata/context
     */
    getMetadata(): Promise<Record<string, any>>;
    /**
     * Update session metadata
     */
    updateMetadata(metadata: Record<string, any>): Promise<void>;
}
/**
 * Guardrail for validating input or output content.
 *
 * @template TContext - Type of context available to validation
 *
 * @property {string} name - Unique identifier for the guardrail
 * @property {'input' | 'output'} type - Whether this validates input or output
 * @property {Function} validate - Validation function that returns a result
 * @param {string} content - Content to validate
 * @param {RunContextWrapper} context - Execution context
 * @returns {Promise<GuardrailResult> | GuardrailResult} Validation result
 */
export interface Guardrail<TContext = any> {
    name: string;
    type: 'input' | 'output';
    validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}
/**
 * Result of a guardrail validation.
 *
 * @property {boolean} passed - Whether validation passed
 * @property {string} [message] - Error message if validation failed
 * @property {Record<string, any>} [metadata] - Additional metadata about the validation
 */
export interface GuardrailResult {
    passed: boolean;
    message?: string;
    metadata?: Record<string, any>;
}
export declare class Agent<TContext = any, TOutput = string> extends AgentHooks<TContext, TOutput> {
    readonly name: string;
    transferDescription?: string;
    handoffDescription?: string;
    private instructions;
    private model;
    private tools;
    private _subagents;
    private guardrails;
    private outputSchema?;
    private maxSteps;
    private modelSettings?;
    private onStepFinish?;
    private shouldFinish?;
    private useTOON?;
    private cachedInstructions?;
    constructor(config: AgentConfig<TContext, TOutput>);
    /**
     * Create an agent instance (alternative to constructor for better TypeScript inference).
     *
     * @template TContext - Type of context object
     * @template TOutput - Type of output
     * @param {AgentConfig} config - Agent configuration
     * @returns {Agent} New agent instance
     *
     * @example
     * ```typescript
     * const agent = Agent.create({
     *   name: 'assistant',
     *   instructions: 'You are helpful.'
     * });
     * ```
     */
    static create<TContext = any, TOutput = string>(config: AgentConfig<TContext, TOutput>): Agent<TContext, TOutput>;
    /**
     * Get the list of sub-agents this agent can transfer to.
     *
     * @returns {Agent[]} Array of sub-agents
     */
    get subagents(): Agent<TContext, any>[];
    /**
     * Get handoffs (legacy/backward compatibility)
     */
    get handoffs(): Agent<TContext, any>[];
    /**
     * Set the list of sub-agents this agent can transfer to.
     * Automatically updates transfer tools when changed.
     *
     * @param {Agent[]} agents - Array of sub-agents
     */
    set subagents(agents: Agent<TContext, any>[]);
    /**
     * Set handoffs (legacy/backward compatibility)
     */
    set handoffs(agents: Agent<TContext, any>[]);
    /**
     * Create handoff tools for delegating to other agents
     */
    /**
     * Create transfer tools for delegating to sub-agents
     */
    private _setupTransferTools;
    /**
     * Get system instructions for the agent.
     * Supports both static strings and dynamic functions.
     * Caches static string instructions for performance.
     *
     * @param {RunContextWrapper} context - Execution context
     * @returns {Promise<string>} System instructions
     * @internal
     */
    getInstructions(context: RunContextWrapper<TContext>): Promise<string>;
    /**
     * Create a clone of this agent with optional property overrides.
     *
     * @param {Partial<AgentConfig>} overrides - Properties to override in the clone
     * @returns {Agent} New agent instance with overridden properties
     *
     * @example
     * ```typescript
     * const baseAgent = new Agent({
     *   name: 'assistant',
     *   instructions: 'You are helpful.'
     * });
     *
     * const specializedAgent = baseAgent.clone({
     *   name: 'specialist',
     *   instructions: 'You are a specialist.'
     * });
     * ```
     */
    clone(overrides: Partial<AgentConfig<TContext, TOutput>>): Agent<TContext, TOutput>;
    /**
     * Convert this agent into a tool that can be used by other agents.
     * Enables the "agent as tool" pattern for hierarchical agent systems.
     *
     * @param {Object} [options] - Tool configuration options
     * @param {string} [options.toolName] - Custom tool name (defaults to `agent_{agentName}`)
     * @param {string} [options.toolDescription] - Custom tool description
     * @returns {CoreTool} Tool definition that delegates to this agent
     *
     * @example
     * ```typescript
     * const researchAgent = new Agent({
     *   name: 'researcher',
     *   instructions: 'You research topics.'
     * });
     *
     * const coordinator = new Agent({
     *   name: 'coordinator',
     *   instructions: 'You coordinate tasks.',
     *   tools: {
     *     research: researchAgent.asTool({
     *       toolDescription: 'Research a topic'
     *     })
     *   }
     * });
     * ```
     */
    asTool(options?: {
        toolName?: string;
        toolDescription?: string;
    }): CoreTool;
    get _model(): LanguageModel;
    get _tools(): Record<string, ToolDefinition>;
    get _guardrails(): Guardrail<TContext>[];
    get _outputSchema(): z.ZodType<TOutput, z.ZodTypeDef, TOutput> | undefined;
    get _maxSteps(): number;
    get _modelSettings(): {
        temperature?: number;
        topP?: number;
        maxTokens?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
    } | undefined;
    get _onStepFinish(): ((step: StepResult) => void | Promise<void>) | undefined;
    get _shouldFinish(): ((context: TContext, toolResults: any[]) => boolean) | undefined;
    get _useTOON(): boolean | undefined;
}
/**
 * Execute an agent with a user message or messages.
 *
 * @template TContext - Type of context object
 * @template TOutput - Type of output (defaults to string)
 *
 * @param {Agent} agent - The agent to execute
 * @param {string | ModelMessage[] | RunState} input - User input as string, messages array, or state to resume
 * @param {RunOptions} [options] - Execution options
 * @returns {Promise<RunResult<TOutput>>} Execution result with final output and metadata
 *
 * @example
 * ```typescript
 * const result = await run(agent, 'Hello!', {
 *   context: { userId: '123' },
 *   session: new MemorySession('user-123')
 * });
 * console.log(result.finalOutput);
 * ```
 */
export declare function run<TContext = any, TOutput = string>(agent: Agent<TContext, TOutput>, input: string | ModelMessage[] | RunState, options?: RunOptions<TContext>): Promise<RunResult<TOutput>>;
/**
 * Execute an agent with streaming responses.
 *
 * @template TContext - Type of context object
 * @template TOutput - Type of output (defaults to string)
 *
 * @param {Agent} agent - The agent to execute
 * @param {string | ModelMessage[]} input - User input as string or messages array
 * @param {RunOptions} [options] - Execution options
 * @returns {Promise<StreamResult<TOutput>>} Streaming result with text stream and completion promise
 *
 * @example
 * ```typescript
 * const stream = await runStream(agent, 'Tell me a story');
 *
 * for await (const chunk of stream.textStream) {
 *   process.stdout.write(chunk);
 * }
 *
 * const result = await stream.completed;
 * ```
 */
export declare function runStream<TContext = any, TOutput = string>(agent: Agent<TContext, TOutput>, input: string | ModelMessage[], options?: RunOptions<TContext>): Promise<StreamResult<TOutput>>;
/**
 * Set the default model for all agents that don't specify a model.
 *
 * @param {LanguageModel} model - The default language model to use
 *
 * @example
 * ```typescript
 * import { openai } from '@ai-sdk/openai';
 * setDefaultModel(openai('gpt-4o'));
 *
 * // Now all agents use gpt-4o by default
 * const agent = new Agent({
 *   name: 'assistant',
 *   instructions: 'You are helpful.'
 *   // No model specified - uses default
 * });
 * ```
 */
export declare function setDefaultModel(model: LanguageModel): void;
/**
 * Create a tool definition from a function (similar to OpenAI's @function_tool).
 * This follows the AI SDK v5 tool format with inputSchema.
 *
 * @template TParams - Zod schema type for tool inputSchema
 *
 * @param {Object} config - Tool configuration
 * @param {string} [config.name] - Optional tool name (defaults to function name)
 * @param {string} config.description - Description of what the tool does
 * @param {z.ZodObject} config.inputSchema - Zod schema for parameter validation
 * @param {Function} config.execute - Tool execution function
 * @param {z.infer<TParams>} config.execute.args - Validated inputSchema
 * @param {RunContextWrapper} [config.execute.context] - Execution context (auto-injected)
 * @returns {CoreTool} Tool definition ready for use in agents
 *
 * @example
 * ```typescript
 * const calculator = tool({
 *   description: 'Perform mathematical calculations',
 *   inputSchema: z.object({
 *     expression: z.string().describe('Mathematical expression to evaluate')
 *   }),
 *   execute: async ({ expression }) => {
 *     return { result: eval(expression) };
 *   }
 * });
 * ```
 */
export declare function tool<TParams extends z.ZodObject<any>>(config: {
    name?: string;
    description: string;
    inputSchema: TParams;
    execute: (args: z.infer<TParams>, context?: any) => Promise<any> | any;
}): CoreTool;
export {};
//# sourceMappingURL=agent.d.ts.map