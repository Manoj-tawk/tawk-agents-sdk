/**
 * Core Agent Implementation
 * 
 * @module agent
 * @description
 * Provides the core Agent class and runner functions that power the Tawk Agents SDK.
 * Built on top of Vercel AI SDK for maximum flexibility and provider support.
 * 
 * Features:
 * - Agents with instructions, tools, and handoffs
 * - Context management (dependency injection)
 * - Automatic conversation history (Sessions)
 * - Guardrails (input/output validation)
 * - Streaming support
 * - Multi-provider support (OpenAI, Anthropic, Google, Mistral, etc.)
 * - Comprehensive error handling
 * - Production-ready patterns
 * 
 * @author Tawk.to
 * @license MIT
 */

import { generateText, streamText, type ModelMessage, type LanguageModel, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { Usage } from './usage';

// Type alias for tool definitions (v5 compatibility)
type ToolDefinition = {
  description?: string;
  inputSchema?: z.ZodSchema<any>; // AI SDK v5 standard
  execute: (args: any, context?: any) => Promise<any> | any;
  enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
};
export type CoreTool = ToolDefinition;
import {
  createTrace,
  formatMessagesForLangfuse,
  extractModelName,
  isLangfuseEnabled,
} from '../lifecycle/langfuse';
import {
  getCurrentTrace,
  getCurrentSpan,
  setCurrentSpan,
} from '../tracing/context';
import { AgentHooks, RunHooks } from '../lifecycle';
import { createTransferTools, detectTransfer, extractUserQuery, createTransferContext } from './transfers';
import type { TransferResult } from './transfers';

// ============================================
// TYPES
// ============================================

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
  transferDescription?: string;  // Description for when to transfer to this agent
  
  // Legacy support (deprecated - use subagents instead)
  handoffs?: Agent<TContext, any>[];
  handoffDescription?: string;
  guardrails?: Guardrail<TContext>[];
  outputSchema?: z.ZodSchema<TOutput>;
  outputType?: z.ZodSchema<TOutput>;  // Alias for outputSchema
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
  useTOON?: boolean; // If true, automatically encode all tool results to TOON format (18-33% token reduction)
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
    totalToolCalls?: number;  // Total tool calls across all steps
    handoffChain?: string[];  // Chain of agents involved in execution
    agentMetrics?: AgentMetric[];  // Per-agent performance metrics
    raceParticipants?: string[];  // All agents in race execution
    raceWinners?: string[];       // Winning agent(s) from race
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
  usage: Usage;  // Track token usage across the run
}

// ============================================
// SESSION INTERFACE
// ============================================

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

// ============================================
// GUARDRAIL INTERFACE
// ============================================

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
  validate: (
    content: string,
    context: RunContextWrapper<TContext>
  ) => Promise<GuardrailResult> | GuardrailResult;
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

// ============================================
// AGENT CLASS
// ============================================

export class Agent<TContext = any, TOutput = string> extends AgentHooks<TContext, TOutput> {
  public readonly name: string;
  public transferDescription?: string;  // Description for agent transfers
  
  // Legacy (deprecated)
  public handoffDescription?: string;
  private instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
  private model: LanguageModel;
  private tools: Record<string, CoreTool>;
  private _subagents: Agent<TContext, any>[] = [];  // Private with getter/setter
  private guardrails: Guardrail<TContext>[];
  private outputSchema?: z.ZodSchema<TOutput>;
  private maxSteps: number;
  private modelSettings?: AgentConfig<TContext, TOutput>['modelSettings'];
  private onStepFinish?: (step: StepResult) => void | Promise<void>;
  private shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
  private useTOON?: boolean; // If true, automatically encode all tool results to TOON format
  // Cached static instructions
  private cachedInstructions?: string;

  constructor(config: AgentConfig<TContext, TOutput>) {
    super(); // Initialize EventEmitter
    this.name = config.name;
    
    // Support both new (transferDescription) and old (handoffDescription) terminology
    this.transferDescription = config.transferDescription || config.handoffDescription;
    this.handoffDescription = config.transferDescription || config.handoffDescription;  // Backward compat
    
    this.instructions = config.instructions;
    this.model = config.model || getDefaultModel();
    this.tools = config.tools || {};
    
    // Support both new (subagents) and old (handoffs) terminology
    this._subagents = config.subagents || config.handoffs || [];
    
    this.guardrails = config.guardrails || [];
    this.outputSchema = config.outputSchema || config.outputType;  // Support both formats
    this.maxSteps = config.maxSteps || 10;
    this.modelSettings = config.modelSettings;
    this.onStepFinish = config.onStepFinish;
    this.shouldFinish = config.shouldFinish;
    this.useTOON = config.useTOON || false;

    // Add transfer tools automatically
    this._setupTransferTools();
  }

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
  static create<TContext = any, TOutput = string>(
    config: AgentConfig<TContext, TOutput>
  ): Agent<TContext, TOutput> {
    return new Agent(config);
  }

  /**
   * Get the list of sub-agents this agent can transfer to.
   * 
   * @returns {Agent[]} Array of sub-agents
   */
  get subagents(): Agent<TContext, any>[] {
    return this._subagents;
  }
  
  /**
   * Get handoffs (legacy/backward compatibility)
   */
  get handoffs(): Agent<TContext, any>[] {
    return this._subagents;
  }

  /**
   * Set the list of sub-agents this agent can transfer to.
   * Automatically updates transfer tools when changed.
   * 
   * @param {Agent[]} agents - Array of sub-agents
   */
  set subagents(agents: Agent<TContext, any>[]) {
    // Remove old transfer/handoff tools first
    const oldToolNames = Object.keys(this.tools).filter(name => 
      name.startsWith('transfer_to_') || name.startsWith('handoff_to_')
    );
    for (const name of oldToolNames) {
      delete this.tools[name];
    }
    
    // Update subagents
    this._subagents = agents || [];
    
    // Re-setup transfer tools
    this._setupTransferTools();
  }
  
  /**
   * Set handoffs (legacy/backward compatibility)
   */
  set handoffs(agents: Agent<TContext, any>[]) {
    this.subagents = agents;  // Delegate to subagents setter
  }

  /**
   * Create handoff tools for delegating to other agents
   */
  /**
   * Create transfer tools for delegating to sub-agents
   */
  private _setupTransferTools(): void {
    const transferTools = createTransferTools(this, this._subagents);
    Object.assign(this.tools, transferTools);
  }

  /**
   * Get system instructions for the agent.
   * Supports both static strings and dynamic functions.
   * Caches static string instructions for performance.
   * 
   * @param {RunContextWrapper} context - Execution context
   * @returns {Promise<string>} System instructions
   * @internal
   */
  async getInstructions(context: RunContextWrapper<TContext>): Promise<string> {
    // Return cached if static instructions
    if (this.cachedInstructions !== undefined) {
      return this.cachedInstructions;
    }
    
    if (typeof this.instructions === 'function') {
      // Always call function as context might change
      return await this.instructions(context);
    }
    
    // Cache static string instructions for performance
    this.cachedInstructions = this.instructions;
    return this.cachedInstructions;
  }

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
  clone(overrides: Partial<AgentConfig<TContext, TOutput>>): Agent<TContext, TOutput> {
    return new Agent({
      name: overrides.name ?? this.name,
      instructions: overrides.instructions ?? this.instructions,
      model: overrides.model ?? this.model,
      tools: overrides.tools ?? this.tools,
      handoffs: overrides.handoffs ?? this.handoffs,
      guardrails: overrides.guardrails ?? this.guardrails,
      outputSchema: overrides.outputSchema ?? this.outputSchema,
      maxSteps: overrides.maxSteps ?? this.maxSteps,
      modelSettings: overrides.modelSettings ?? this.modelSettings,
      onStepFinish: overrides.onStepFinish ?? this.onStepFinish,
      shouldFinish: overrides.shouldFinish ?? this.shouldFinish,
      useTOON: overrides.useTOON ?? this.useTOON
    });
  }

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
  asTool(options: {
    toolName?: string;
    toolDescription?: string;
  } = {}): CoreTool {
    const _toolName = options.toolName || `agent_${this.name.toLowerCase().replace(/\s+/g, '_')}`;
    const toolDescription = options.toolDescription || `Delegate to ${this.name}`;

    return {
      description: toolDescription,
      inputSchema: z.object({
        query: z.string().describe('Query or request for the agent')
      }),
      execute: async ({ query }: { query: string }, context: any) => {
        // Run the agent and return its output
        const result = await run(this, query, {
          context: context as TContext
        });
        return result.finalOutput;
      }
    };
  }

  // Getters for internal access
  get _model() { return this.model; }
  get _tools() { return this.tools; }
  get _guardrails() { return this.guardrails; }
  get _outputSchema() { return this.outputSchema; }
  get _maxSteps() { return this.maxSteps; }
  get _modelSettings() { return this.modelSettings; }
  get _onStepFinish() { return this.onStepFinish; }
  get _shouldFinish() { return this.shouldFinish; }
  get _useTOON() { return this.useTOON; }
}

// ============================================
// RUNNER
// ============================================

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
export async function run<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[] | RunState,
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  // Import runner from separate file for clean architecture
  const { AgenticRunner } = await import('./runner');
  
  // Handle resuming from RunState
  if (isRunState(input)) {
    return await resumeRun(input, options);
  }

  const runner = new AgenticRunner<TContext, TOutput>(options);
  return await runner.execute(agent, input, options);
}

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
export async function runStream<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> = {}
): Promise<StreamResult<TOutput>> {
  const runner = new Runner(agent, { ...options, stream: true });
  return await runner.executeStream(input);
}

/**
 * Resume a run from a saved state (for human-in-the-loop)
 */
async function resumeRun<TContext = any, TOutput = string>(
  state: RunState,
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  const runner = new Runner(state.agent, {
    ...options,
    context: state.context
  });
  
  return await runner.execute(state.messages, state);
}

function isRunState(input: any): input is RunState {
  return input && typeof input === 'object' && 'agent' in input && 'messages' in input;
}

// ============================================
// RUNNER IMPLEMENTATION
// ============================================

class Runner<TContext = any, TOutput = string> extends RunHooks<TContext, TOutput> {
  private agent: Agent<TContext, TOutput>;
  private options: RunOptions<TContext>;
  private context: TContext;
  private session?: Session<TContext>;
  private steps: StepResult[] = [];
  private totalTokens = 0;
  private promptTokens = 0;
  private completionTokens = 0;
  private handoffChain: string[] = [];
  private handoffChainSet: Set<string> = new Set(); // Fast O(1) lookup for handoff chain
  private originalInput: string | ModelMessage[] = '';  // Store original input for context isolation
  private agentMetrics: Map<string, AgentMetric> = new Map();
  private trace: any = null; // Langfuse trace
  private currentAgentSpan: any = null; // Current agent span for nesting
  // Reusable objects for memory efficiency
  private reusableUsage: Usage = new Usage(); // Single Usage instance
  private contextWrapperCache: RunContextWrapper<TContext> | null = null; // Context wrapper cache
  // Message formatting cache for Langfuse tracing
  private formattedMessagesCache: any[] | null = null;
  private lastMessageCount = 0;
  // Incremental metadata tracking
  private totalToolCallsCount = 0; // Track incrementally instead of recalculating
  // Cache converted model messages to avoid repeated conversion
  private cachedModelMessages: ModelMessage[] | null = null;
  private lastHistoryLength = 0;
  // Handoff context for next agent (provider-agnostic approach)
  private pendingHandoffContext: string | null = null;

  constructor(agent: Agent<TContext, TOutput>, options: RunOptions<TContext>) {
    super(); // Initialize EventEmitter
    this.agent = agent;
    this.options = options;
    this.context = options.context || {} as TContext;
    this.session = options.session;
  }

  /**
   * Get or create context wrapper for tool execution
   */
  private getContextWrapper(agent: Agent<TContext, any>, messages: ModelMessage[]): RunContextWrapper<TContext> {
    // Update usage values
    this.reusableUsage.inputTokens = this.promptTokens;
    this.reusableUsage.outputTokens = this.completionTokens;
    this.reusableUsage.totalTokens = this.totalTokens;
    
    // Reuse or create wrapper
    if (!this.contextWrapperCache) {
      this.contextWrapperCache = {
        context: this.context,
        agent,
        messages,
        usage: this.reusableUsage,
      };
    } else {
      // Update references for efficient property access
      this.contextWrapperCache.agent = agent;
      this.contextWrapperCache.messages = messages;
    }
    
    return this.contextWrapperCache;
  }

  /**
   * Get formatted messages for Langfuse tracing
   * Messages are cached since they only grow during execution
   */
  private getFormattedMessages(messages: ModelMessage[]): any[] {
    // Check if we can use cache
    if (this.formattedMessagesCache && messages.length === this.lastMessageCount) {
      return this.formattedMessagesCache;
    }
    
    // Format and cache
    this.formattedMessagesCache = formatMessagesForLangfuse(messages);
    this.lastMessageCount = messages.length;
    return this.formattedMessagesCache;
  }

  /**
   * Wrap tools to automatically inject context for execution
   * Tools can access run context without manual setup
   * Wrapped tools are cached per agent
   */
  /**
   * Wrap tools with context injection and filter by enabled conditions
   * Enabled conditions are re-evaluated on every agent step
   */
  // Cache TOON encoder to avoid repeated dynamic imports
  private static cachedEncodeTOON: ((data: any) => string) | null = null;
  private static toonImportPromise: Promise<any> | null = null;

  private async wrapToolsWithContext(
    agentName: string,
    tools: Record<string, CoreTool>,
    contextWrapper: RunContextWrapper<TContext>,
    useTOON: boolean = false
  ): Promise<Record<string, CoreTool>> {
    // Create wrapped and filtered tools (no caching due to dynamic enabled conditions)
    const wrapped: Record<string, CoreTool> = {};
    
    // Import encodeTOON only if needed (lazy import for performance)
    // Cache the import at class level to avoid repeated dynamic imports
    let encodeTOON: ((data: any) => string) | null = null;
    if (useTOON) {
      // Use cached encoder if available
      if (Runner.cachedEncodeTOON) {
        encodeTOON = Runner.cachedEncodeTOON;
      } else {
        // Import once and cache
        try {
          if (!Runner.toonImportPromise) {
            Runner.toonImportPromise = import('../helpers/toon');
          }
          const toonModule = await Runner.toonImportPromise;
          encodeTOON = toonModule.encodeTOON;
          Runner.cachedEncodeTOON = encodeTOON;
        } catch (error) {
          // Silently fail - don't log in production to avoid overhead
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TOON] Failed to import encodeTOON, tool results will not be encoded:', error);
          }
        }
      }
    }
    
    for (const [name, tool] of Object.entries(tools)) {
      // Check if tool is enabled
      if (tool.enabled !== undefined) {
        let isEnabled: boolean;
        
        if (typeof tool.enabled === 'function') {
          // Evaluate enabled function
          isEnabled = await tool.enabled(contextWrapper);
        } else {
          // Use boolean value
          isEnabled = tool.enabled;
        }
        
        // Skip disabled tools
        if (!isEnabled) {
          continue;
        }
      }
      
      // Tool is enabled, wrap it with context
      const originalExecute = tool.execute;
      const wrappedTool = {
        ...tool,
        execute: async (args: any, _options: any) => {
          if (originalExecute) {
            const result = await originalExecute(args, contextWrapper as any);
            
            // Auto-encode to TOON if enabled and result is an object/array
            // Skip encoding for small results to avoid overhead
            if (useTOON && encodeTOON && result !== null && result !== undefined) {
              // Skip encoding if already a string (might already be TOON or JSON string)
              // Only encode objects/arrays for maximum token savings
              if (typeof result === 'object' && !(result instanceof Error)) {
                try {
                  // Skip handoff markers (they need to stay as objects)
                  if (result && typeof result === 'object' && '__handoff' in result) {
                    return result;
                  }
                  
                  // Quick heuristic: only encode arrays/objects with multiple items
                  // Single-item objects or small arrays don't benefit enough from TOON
                  const isArray = Array.isArray(result);
                  if (isArray && result.length < 3) {
                    // Skip encoding for small arrays (overhead not worth it)
                    return result;
                  }
                  if (!isArray && Object.keys(result).length < 5) {
                    // Skip encoding for small objects (overhead not worth it)
                    return result;
                  }
                  
                  // Encode to TOON for 18-33% token reduction (only for larger results)
                  return encodeTOON(result);
                } catch (error) {
                  // If encoding fails, return original result (silently - no logging overhead)
                  return result;
                }
              }
            }
            
            return result;
          }
          return {};
        }
      };
      wrapped[name] = wrappedTool;
    }
    
    return wrapped;
  }

  async execute(
    input: string | ModelMessage[],
    resumeState?: RunState
  ): Promise<RunResult<TOutput>> {
    // Store original input for context isolation during transfers
    this.originalInput = input;
    
    // Auto-initialize Langfuse if credentials are available (enabled by default)
    // Tracing works automatically without manual initialization
    isLangfuseEnabled(); // This will auto-initialize if env vars are present
    
    // Prepare messages first to get input for trace
    let messages = await this.prepareMessages(input);
    
    // Get or create Langfuse trace from context
    let trace = getCurrentTrace();
    
    if (!trace && isLangfuseEnabled()) {
      // Only create trace if not already in a trace context
      // Extract initial input for trace
      const initialInput = typeof input === 'string' 
        ? input 
        : messages.find(m => m.role === 'user')?.content || messages;
      
      trace = createTrace({
        name: `Agent Run: ${this.agent.name}`,
        input: initialInput,
        metadata: {
          agentName: this.agent.name,
          maxTurns: this.options.maxTurns || 50,
        },
        tags: ['agent', 'run'],
      });
    }
    
    this.trace = trace;
    let currentAgent = this.agent;
    let stepNumber = resumeState?.stepNumber || 0;

    // Run guardrails on input
    if (!resumeState) {
      await this.runInputGuardrails(messages);
    }

    // Wrap execution in try-finally to ensure proper cleanup
    try {
    // Main agent loop
    while (stepNumber < (this.options.maxTurns || 50)) {
      stepNumber++;

      // Debug loop iteration
      if (process.env.DEBUG_LOOP) {
        console.log(`\n[DEBUG] Step ${stepNumber}`);
        console.log(`- Agent: ${currentAgent.name}`);
        console.log(`- Messages: ${messages.length}`);
      }

      // Create or update agent span when agent changes
      if (!this.currentAgentSpan || this.currentAgentSpan._agentName !== currentAgent.name) {
        // End previous agent span if exists (with full output)
        if (this.currentAgentSpan) {
          const prevAgentMetric = this.agentMetrics.get(this.currentAgentSpan._agentName);
          const tokensDelta = {
            prompt: this.promptTokens - (this.currentAgentSpan._startTokens?.prompt || 0),
            completion: this.completionTokens - (this.currentAgentSpan._startTokens?.completion || 0),
            total: this.totalTokens - (this.currentAgentSpan._startTokens?.total || 0),
          };
          
          // Langfuse: Update span with usage before ending (spans don't accept usage in end())
          if (tokensDelta.total > 0 && this.currentAgentSpan.update) {
            try {
              this.currentAgentSpan.update({
                usage: {
                  input: tokensDelta.prompt,
                  output: tokensDelta.completion,
                  total: tokensDelta.total,
                },
              });
              // Log success for debugging
              if (process.env.DEBUG_LANGFUSE) {
                console.log(`[Langfuse] Updated agent span usage: ${tokensDelta.prompt}/${tokensDelta.completion}/${tokensDelta.total}`);
              }
            } catch (error) {
              // Log error if usage update fails
              console.warn(`[Langfuse] Failed to update agent span usage:`, error);
            }
          }
          
          this.currentAgentSpan.end({
            output: {
              totalSteps: this.steps.length - (this.currentAgentSpan._startStepCount || 0),
              totalToolCalls: prevAgentMetric?.toolCalls || 0,
              totalTransfers: 1,
            },
            metadata: {
              totalSteps: this.steps.length,
              totalToolCalls: prevAgentMetric?.toolCalls || 0,
              totalTransfers: 1,
            },
          });
          this.currentAgentSpan._ended = true;
        }

        // Emit agent_start event
        const contextWrapper = this.getContextWrapper(currentAgent, messages);
        this.emit('agent_start', contextWrapper, currentAgent);
        currentAgent.emit('agent_start', contextWrapper, currentAgent);

        // Create new agent span using context (auto-nests under trace)
        if (this.trace) {
          // Get parent from context or use trace
          const parent = getCurrentSpan() || this.trace;
          
          this.currentAgentSpan = parent.span({
            name: `Agent: ${currentAgent.name}`,
            input: {
              messages: this.getFormattedMessages(messages),
              stepNumber,
              turnNumber: stepNumber,
            },
            metadata: {
              agentName: currentAgent.name,
              tools: Object.keys(currentAgent._tools || {}),
              handoffs: currentAgent.handoffs.map(a => a.name),
              stepNumber,
              turnNumber: stepNumber,
              transferCount: 0,
              toolCallCount: 0,
              architecture: 'flat',
            },
          });
          this.currentAgentSpan._agentName = currentAgent.name; // Track which agent this span is for
          this.currentAgentSpan._startStepCount = this.steps.length; // Track starting step count
          this.currentAgentSpan._startTokens = {
            prompt: this.promptTokens,
            completion: this.completionTokens,
            total: this.totalTokens,
          };
          
          // Set as current span in context
          setCurrentSpan(this.currentAgentSpan);
        }
      }

      // Get system instructions
      const contextWrapper = this.getContextWrapper(currentAgent, messages);
      let systemMessage = await currentAgent.getInstructions(contextWrapper);
      
      // Provider-agnostic handoff: Prepend handoff context to system message
      // This avoids multiple system messages in the array (Anthropic restriction)
      // and works with all providers (OpenAI, Groq, Claude, etc.)
      if (this.pendingHandoffContext) {
        systemMessage = `${this.pendingHandoffContext}\n\n${systemMessage}`;
        this.pendingHandoffContext = null; // Clear after use
      }

      // Create generation span nested under agent span
      // Only created when Langfuse tracing is enabled
      let generation: any = null;
      if (isLangfuseEnabled() && this.currentAgentSpan) {
        generation = this.currentAgentSpan.generation({
          name: `Generation - Step ${stepNumber}`,
          model: extractModelName(currentAgent._model),
          input: this.getFormattedMessages(messages),
          metadata: {
            stepNumber,
            agentName: currentAgent.name,
            systemMessage,
          },
        });
      }

      // Wrap tools to inject context automatically (similar to OpenAI Agents SDK)
      // Also filters tools based on enabled conditions
      // Auto-encode tool results to TOON if useTOON is enabled
      const wrappedTools = await this.wrapToolsWithContext(
        currentAgent.name, 
        currentAgent._tools, 
        contextWrapper,
        currentAgent._useTOON || false
      );

      // Let the model decide whether to call tools or generate text
      // We rely on instructions and shouldFinish callback to guide behavior
      // This makes the SDK compatible with all providers (including Groq)
      const toolChoice = undefined; // Optional - let model decide
      const _maxSteps = currentAgent._maxSteps;

      // Debug: Log tools structure
      if (process.env.DEBUG_TOOLS) {
        console.log('[DEBUG] Tools passed to generateText:');
        console.log('- Type:', Array.isArray(wrappedTools) ? 'Array' : 'Object');
        console.log('- Keys:', Object.keys(wrappedTools));
        const firstToolKey = Object.keys(wrappedTools)[0];
        const firstTool = wrappedTools[firstToolKey];
        console.log('- First tool:', JSON.stringify({
          key: firstToolKey,
          hasDescription: !!firstTool?.description,
          hasinputSchema: !!firstTool?.inputSchema,
          hasInputSchema: !!(firstTool as any)?.inputSchema,
          inputSchemaType: (firstTool as any)?.inputSchema?.constructor?.name,
          hasExecute: typeof firstTool?.execute === 'function'
        }, null, 2));
      }

      // Execute agent step (single step, we manage loop manually)
      // Ensure messages are properly converted to ModelMessage[] before generateText
      // All providers (OpenAI, Anthropic, Groq) require ModelMessage[] (not UIMessage[])
      // Always convert to be safe - AI SDK's convertToModelMessages is idempotent
      
      // Debug logging only in development
      if (process.env.DEBUG_MESSAGES) {
        console.log(`\n[🔍 MESSAGE DEBUG] Step ${stepNumber} - Agent: ${currentAgent.name}, Messages: ${messages.length}`);
      }
      
      // Messages are ModelMessage[] from prepareMessages(), but may contain
      // array content (tool calls/results) that needs deep cloning to prevent
      // corruption during AI SDK's internal JSON serialization.
      // String content can be used directly (no cloning needed).
      const finalMessages: ModelMessage[] = messages.map((msg: any): ModelMessage => {
        if (typeof msg.content === 'string') {
          // String content - use directly, no cloning needed
          return { role: msg.role, content: msg.content };
        }
        if (Array.isArray(msg.content)) {
          // Array content (tool calls/results) - deep clone to prevent corruption
          // Required because AI SDK's internal processing can mutate references
          return { role: msg.role, content: JSON.parse(JSON.stringify(msg.content)) };
        }
        // Fallback
        return { role: msg.role, content: msg.content };
      });
      
      const result = await generateText({
        model: currentAgent._model,
        system: systemMessage,
        messages: finalMessages,
        tools: wrappedTools as any,
        toolChoice: toolChoice as any,
        stopWhen: stepCountIs(_maxSteps),
        temperature: currentAgent._modelSettings?.temperature,
        topP: currentAgent._modelSettings?.topP,
        maxTokens: currentAgent._modelSettings?.maxTokens,
        presencePenalty: currentAgent._modelSettings?.presencePenalty,
        frequencyPenalty: currentAgent._modelSettings?.frequencyPenalty
      } as any);

      // Debug: Log result structure
      if (process.env.DEBUG_TOOLS) {
        console.log('[DEBUG] generateText result:');
        console.log('- text:', result.text?.substring(0, 100));
        console.log('- toolCalls:', result.toolCalls?.length || 0);
        console.log('- toolResults:', result.toolResults?.length || 0);
        console.log('- response.messages length:', result.response?.messages?.length || 0);
        if (result.toolCalls && result.toolCalls.length > 0) {
          const firstCall = result.toolCalls[0] as any;
          console.log('- First tool call:', JSON.stringify({
            toolName: firstCall.toolName,
            hasArgs: !!firstCall.args
          }));
        }
        if (result.toolResults && result.toolResults.length > 0) {
          const firstResult = result.toolResults[0] as any;
          console.log('- First tool result:', JSON.stringify({
            toolName: firstResult.toolName,
            hasResult: !!firstResult.result
          }));
        }
      }

      // Extract tool results from the AI SDK response
      // Uses efficient Map lookups for tool call matching
      const toolCalls: Array<{ toolName: string; args: any; result: any }> = [];
      
      if (result.response?.messages) {
        const msgs = result.response.messages;
        
        // Build a map of toolCallId to result for efficient lookup
        // AI SDK v5 format: { type: 'tool-result', toolCallId: '...', output: { type: 'json', value: {...} } }
        const resultMap = new Map<string, any>();
        for (const msg of msgs) {
          if (msg.role === 'tool' && Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if ((part as any).type === 'tool-result') {
                // Extract the actual value from AI SDK v5's output.value structure
                const value = (part as any).output?.value || (part as any).result;
                resultMap.set((part as any).toolCallId, value);
              }
            }
          }
        }
        
        // Extract tool calls and match with results
        for (const msg of msgs) {
          if (msg.role === 'assistant' && Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if ((part as any).type === 'tool-call') {
                const toolCallId = (part as any).toolCallId;
                const result = resultMap.get(toolCallId);
                if (result !== undefined) {
                  toolCalls.push({
                    toolName: (part as any).toolName,
                    args: (part as any).args,
                    result
                  });
                }
              }
            }
          }
        }
      }

      // Update token usage and metrics
      if (result.usage) {
        this.totalTokens += result.usage.totalTokens || 0;
        this.promptTokens += result.usage.inputTokens || 0;
        this.completionTokens += result.usage.outputTokens || 0;
        
        // Record agent-specific usage with tool count
        this.recordAgentUsage(currentAgent.name, {
          prompt: result.usage.inputTokens || 0,
          completion: result.usage.outputTokens || 0,
          total: result.usage.totalTokens || 0,
        }, toolCalls.length);

        // Only end generation when agent task is truly complete
        // Don't end it here - we'll end it after checking for handoffs/finish
        // Generation captures the complete output (tool calls + final text)
        // The generation will be ended in the finish block or when handoff occurs
      }

      // Filter unwanted text when tool calls are present
      // Some models (e.g., Groq/Llama) generate text alongside tool calls
      // For handoff tools, ignore text to let the target agent respond
      // For other tools, keep text only if finishReason is 'stop' (final answer with tool result)
      const hasHandoffCall = toolCalls.some(tc => tc.result?.__handoff === true);
      const isRoutingAgent = currentAgent.handoffs && currentAgent.handoffs.length > 0;
      const shouldIgnoreText = hasHandoffCall || (toolCalls.length > 0 && result.finishReason !== 'stop');
      
      // Normalize text: handle cases where model returns object instead of string
      let normalizedText = '';
      if (result.text) {
        if (typeof result.text === 'string') {
          normalizedText = result.text;
        } else if (typeof result.text === 'object') {
          // Model returned object in text field (shouldn't happen, but handle gracefully)
          normalizedText = '';
        }
      }
      
      // Validation: Routing agents should NOT generate text alongside tool calls
      if (isRoutingAgent && toolCalls.length > 0 && normalizedText && normalizedText.trim().length > 0) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_ROUTING) {
          console.warn(
            `⚠️  [Agent: ${currentAgent.name}] Routing agent generated text alongside tool calls. ` +
            `This text will be filtered out. Consider updating agent instructions to prevent text generation.`
          );
        }
      }
      
      const step: StepResult = {
        stepNumber,
        toolCalls,
        text: shouldIgnoreText ? '' : normalizedText, // Ignore text for handoffs or mid-flow tool calls
        // Override finishReason if tool calls exist but SDK returned "stop"
        // Some models (e.g., gpt-4o-mini) return "stop" even when making tool calls
        finishReason: toolCalls.length > 0 && result.finishReason === 'stop' 
          ? 'tool-calls' 
          : result.finishReason
      };
      this.steps.push(step);
      
      // Track total tool calls incrementally for efficiency
      this.totalToolCallsCount += toolCalls.length;

      // Call step finish hook
      if (currentAgent._onStepFinish) {
        await currentAgent._onStepFinish(step);
      }

      // Check for transfers (context isolation for true agentic behavior)
      const transfer = detectTransfer(toolCalls, currentAgent);
      
      // Add response messages
      if (result.response && result.response.messages && Array.isArray(result.response.messages)) {
        Array.prototype.push.apply(messages, result.response.messages);
      } else {
        // Fallback: add assistant message (only if no transfer)
        if (!transfer) {
          messages.push({
            role: 'assistant',
            content: normalizedText
          });
        }
      }

      if (transfer) {
        // **CONTEXT ISOLATION** - True agentic behavior
        // Each agent starts FRESH - no message history carried over!
        
        // Close current agent span before transferring
        if (this.currentAgentSpan && !this.currentAgentSpan._ended) {
          this.currentAgentSpan.end({
            output: {
              transferTo: transfer.agent.name,
              transferReason: transfer.reason,
            },
            metadata: {
              transferTo: transfer.agent.name,
              type: 'transfer',
              isolated: true,  // Context isolation flag
            },
          });
          this.currentAgentSpan._ended = true;
          setCurrentSpan(null);
          this.currentAgentSpan = null;
        }
        
        // Emit transfer event
        const contextWrapper = this.getContextWrapper(currentAgent, messages);
        this.emit('agent_transfer', contextWrapper, transfer.agent);
        currentAgent.emit('agent_transfer', contextWrapper, transfer.agent);
        
        // CONTEXT ISOLATION: Extract clean user query only
        const isolatedQuery = transfer.query || extractUserQuery(this.originalInput);
        
        // Create fresh message history with ONLY the query
        messages = [
          {
            role: 'user',
            content: isolatedQuery
          }
        ];
        
        // Add transfer context to system message (will be prepended on next iteration)
        this.pendingHandoffContext = createTransferContext(currentAgent.name, transfer.agent.name, transfer.reason);
        
        // Switch to new agent (fresh start!)
        currentAgent = transfer.agent;
        
        // Track transfer in chain
        this.handoffChain.push(transfer.agent.name);
        
        // Continue loop - new agent span will be created on next iteration with isolated context
        continue;
      }

      // End generation when finishReason is 'tool-calls' (tool call only, no final text yet)
      // This happens when generateText does only the tool call step, not the final text step
      // Handle cases where SDK returns "stop" but tool calls exist
      const effectiveFinishReason = toolCalls.length > 0 && result.finishReason === 'stop' 
        ? 'tool-calls' 
        : result.finishReason;
      
      if (generation && result.usage && effectiveFinishReason === 'tool-calls') {
        try {
          generation.end({
            output: {
              toolCalls: toolCalls.map(tc => ({
                tool: tc.toolName,
                args: tc.args,
                result: tc.result
              })),
              text: ''
            },
            usage: {
              input: result.usage.inputTokens || 0,
              output: result.usage.outputTokens || 0,
              total: result.usage.totalTokens || 0,
            },
            metadata: {
              finishReason: effectiveFinishReason,
              toolCallsCount: toolCalls.length,
              totalToolCalls: toolCalls.length,
            },
          });
        } catch (error) {
          console.error('[Generation] Failed to end generation:', error);
        }
        // Continue loop - next iteration will create a new generation for the final text
        continue;
      }

      // Check if we should finish
      // finishReason='stop' indicates model generated final text (not tool calls only)
      // finishReason='tool-calls' indicates model only generated tool calls (needs continuation)
      let shouldFinish = currentAgent._shouldFinish 
        ? currentAgent._shouldFinish(this.context, toolCalls.map(tc => tc.result))
        : result.finishReason === 'stop' || result.finishReason === 'length' || result.finishReason === 'content-filter';

      // SAFETY CHECK: Detect infinite loops for routing agents
      // If a routing agent (with shouldFinish callback) generates text without calling tools,
      // and shouldFinish returns false, the agent will loop forever.
      // Solution: After 2 consecutive text-only generations, force finish with a clear error message
      let overrideText: string | undefined;
      if (!shouldFinish && currentAgent._shouldFinish && toolCalls.length === 0 && result.text) {
        // Count consecutive text-only generations for this agent
        const recentSteps = this.steps.slice(-2);
        const consecutiveTextOnlySteps = recentSteps.filter(s => 
          s.toolCalls.length === 0 && s.text && s.text.length > 0
        ).length;
        
        if (consecutiveTextOnlySteps >= 2) {
          // Force finish to prevent infinite loop
          shouldFinish = true;
          // Override the text with a clear error message
          overrideText = "I apologize, but I'm unable to process this request. The query doesn't match my routing capabilities. If you need assistance, please rephrase your question or contact support.";
          console.warn(`[Agent: ${currentAgent.name}] Detected infinite loop - forcing finish after ${consecutiveTextOnlySteps} text-only generations`);
        }
      }

      if (shouldFinish) {
        // Use override text if loop was detected, otherwise use result.text
        const finalText = overrideText ?? result.text;
        
        // End generation with final output (text + tool calls if any)
        if (generation && result.usage) {
          let generationOutput: any;
          if (toolCalls.length > 0) {
            // Include tool calls if they exist (from previous step)
            generationOutput = {
              toolCalls: toolCalls.map(tc => ({
                tool: tc.toolName,
                args: tc.args,
                result: tc.result
              })),
              text: finalText || ''
            };
          } else {
            // No tool calls - use text output only
            generationOutput = finalText || null;
          }
          
          try {
            generation.end({
              output: generationOutput,
              usage: {
                input: result.usage.inputTokens || 0,
                output: result.usage.outputTokens || 0,
                total: result.usage.totalTokens || 0,
              },
              metadata: {
                finishReason: result.finishReason,
                toolCallsCount: toolCalls.length,
                totalToolCalls: toolCalls.length,
              },
            });
          } catch (error) {
            console.error('[Generation] Failed to end generation:', error);
          }
        }

        // Run output guardrails
        await this.runOutputGuardrails(finalText);

        // Parse output if schema provided
        // Add error handling for JSON parsing
        let finalOutput: TOutput;
        if (currentAgent._outputSchema) {
          try {
            const parsed = JSON.parse(finalText);
            finalOutput = currentAgent._outputSchema.parse(parsed);
          } catch (error: any) {
            // Fallback: try to extract JSON from markdown code blocks
            const jsonMatch = finalText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                finalOutput = currentAgent._outputSchema.parse(parsed);
              } catch {
                // Final fallback: return text as-is
                finalOutput = finalText as TOutput;
              }
            } else {
              // Fallback: return text as-is
              finalOutput = finalText as TOutput;
            }
          }
        } else {
          finalOutput = finalText as TOutput;
        }

        // Save to session
        if (this.session) {
          await this.session.addMessages(messages);
        }

        // End current agent span with full output
        if (this.currentAgentSpan) {
          const agentMetric = this.agentMetrics.get(this.currentAgentSpan._agentName);
          const tokensDelta = {
            prompt: this.promptTokens - (this.currentAgentSpan._startTokens?.prompt || 0),
            completion: this.completionTokens - (this.currentAgentSpan._startTokens?.completion || 0),
            total: this.totalTokens - (this.currentAgentSpan._startTokens?.total || 0),
          };
          
          // Langfuse: Update span with usage before ending (spans don't accept usage in end())
          if (tokensDelta.total > 0 && this.currentAgentSpan.update) {
            try {
              this.currentAgentSpan.update({
                usage: {
                  input: tokensDelta.prompt,
                  output: tokensDelta.completion,
                  total: tokensDelta.total,
                },
              });
              // Log success for debugging
              if (process.env.DEBUG_LANGFUSE) {
                console.log(`[Langfuse] Updated agent span usage: ${tokensDelta.prompt}/${tokensDelta.completion}/${tokensDelta.total}`);
              }
            } catch (error) {
              // Log error if usage update fails
              console.warn(`[Langfuse] Failed to update agent span usage:`, error);
            }
          }
          
          this.currentAgentSpan.end({
            output: {
              finalOutput: typeof finalOutput === 'string' ? finalOutput.substring(0, 500) : finalOutput,
              stepCount: this.steps.length - (this.currentAgentSpan._startStepCount || 0),
              totalSteps: this.steps.length,
              totalToolCalls: agentMetric?.toolCalls || 0,
              totalTransfers: 0,
              messagesProduced: messages.length,
              finishReason: result.finishReason,
            },
            metadata: {
              totalSteps: this.steps.length,
              totalToolCalls: agentMetric?.toolCalls || 0,
              totalTransfers: 0,
            },
          });
          this.currentAgentSpan._ended = true;
        }

        // End root trace with final output and aggregated usage
        if (this.trace) {
          try {
            this.trace.update({
              output: typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput),
              usage: {
                input: this.promptTokens,
                output: this.completionTokens,
                total: this.totalTokens,
              },
              metadata: {
                totalSteps: this.steps.length,
                totalToolCalls: this.totalToolCallsCount,
                handoffChain: this.handoffChain.length > 0 ? this.handoffChain : undefined,
                agentMetrics: Array.from(this.agentMetrics.values()),
                finishReason: result.finishReason,
              },
            });
          } catch (error) {
            console.error('[Trace] Failed to update trace with final output:', error);
          }
        }

        return {
          finalOutput,
          messages,
          steps: this.steps,
          metadata: {
            totalTokens: this.totalTokens,
            promptTokens: this.promptTokens,
            completionTokens: this.completionTokens,
            finishReason: result.finishReason,
            // Use incrementally tracked count for efficiency
            totalToolCalls: this.totalToolCallsCount,
            handoffChain: this.handoffChain.length > 0 ? this.handoffChain : undefined,
            agentMetrics: Array.from(this.agentMetrics.values()),
          }
        };
      }
    }

    // End current agent span before throwing (max turns)
    if (this.currentAgentSpan) {
      const agentMetric = this.agentMetrics.get(this.currentAgentSpan._agentName);
      const _tokensDelta = {
        prompt: this.promptTokens - (this.currentAgentSpan._startTokens?.prompt || 0),
        completion: this.completionTokens - (this.currentAgentSpan._startTokens?.completion || 0),
        total: this.totalTokens - (this.currentAgentSpan._startTokens?.total || 0),
      };
      
      this.currentAgentSpan.end({
        output: {
          error: 'Max turns exceeded',
          stepCount: this.steps.length,
          totalSteps: this.steps.length,
          totalToolCalls: agentMetric?.toolCalls || 0,
          totalTransfers: 0,
        },
        level: 'ERROR',
        statusMessage: 'Max turns exceeded',
      });
      this.currentAgentSpan._ended = true;
    }
    
    // Get recent activity for debugging
    const lastStep = this.steps[this.steps.length - 1];
    const lastStepInfo = lastStep 
      ? `Last step (#${lastStep.stepNumber}): ${lastStep.text?.substring(0, 150) || 'tool calls only'}...`
      : 'No steps completed';
    
    const maxTurns = this.options.maxTurns || 50;
    const traceUrl = this.trace?.url || 'N/A';
    
    throw new Error(
      `Max turns exceeded (${stepNumber}/${maxTurns}).\n` +
      `Current agent: ${currentAgent.name}\n` +
      `${lastStepInfo}\n\n` +
      `Possible causes:\n` +
      `  - Infinite loop: Agent keeps generating text without calling tools\n` +
      `  - Missing handoff: Routing agent not calling handoff tools\n` +
      `  - Complex query: Task requires more steps than maxTurns allows\n\n` +
      `Solutions:\n` +
      `  - Check agent instructions for clarity\n` +
      `  - Increase maxTurns if the task is genuinely complex\n` +
      `  - Review Langfuse trace for patterns: ${traceUrl}`
    );
    
    } finally {
      // Cleanup spans in all cases (success, error, interruption)
      // Ensures Langfuse traces are properly closed
      if (this.currentAgentSpan) {
        try {
          const agentMetric = this.agentMetrics.get(this.currentAgentSpan._agentName);
          const _tokensDelta = {
            prompt: this.promptTokens - (this.currentAgentSpan._startTokens?.prompt || 0),
            completion: this.completionTokens - (this.currentAgentSpan._startTokens?.completion || 0),
            total: this.totalTokens - (this.currentAgentSpan._startTokens?.total || 0),
          };
          
          // Only end if not already ended
          if (!this.currentAgentSpan._ended) {
          this.currentAgentSpan.end({
            output: {
              totalSteps: this.steps.length,
              totalToolCalls: agentMetric?.toolCalls || 0,
            },
          });
          this.currentAgentSpan._ended = true;
        }
      } catch (error) {
        console.error('[Trace Cleanup] Failed to close agent span:', error);
      } finally {
        this.currentAgentSpan = null;
        setCurrentSpan(null);
      }
    }
    }
  }

  async executeStream(
    input: string | ModelMessage[]
  ): Promise<StreamResult<TOutput>> {
    const messages = await this.prepareMessages(input);
    
    // Run input guardrails
    await this.runInputGuardrails(messages);

    const contextWrapper = this.getContextWrapper(this.agent, messages);
    const systemMessage = await this.agent.getInstructions(contextWrapper);

    // Wrap tools to inject context automatically (same as non-streaming)
    // Also filters tools based on enabled conditions
    // Auto-encode tool results to TOON if useTOON is enabled
    const wrappedTools = await this.wrapToolsWithContext(
      this.agent.name, 
      this.agent._tools, 
      contextWrapper,
      this.agent._useTOON || false
    );

    const result = streamText({
      model: this.agent._model,
      system: systemMessage,
      messages,
      tools: wrappedTools as any,
      // Note: v5 handles multi-step automatically
      temperature: this.agent._modelSettings?.temperature,
      topP: this.agent._modelSettings?.topP,
      maxTokens: this.agent._modelSettings?.maxTokens
    } as any);

    // Create text stream
    const textStream = result.textStream;

    // Create full stream with events
    const fullStream = this.createFullStream(result);

    // Create completion promise
    const completed = this.handleStreamCompletion(result, messages);

    return {
      textStream,
      fullStream,
      completed
    };
  }

  private async *createFullStream(result: any): AsyncIterable<StreamChunk> {
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        yield {
          type: 'text-delta',
          textDelta: chunk.textDelta
        };
      } else if (chunk.type === 'tool-call') {
        yield {
          type: 'tool-call',
          toolCall: {
            toolName: chunk.toolName,
            args: chunk.args
          }
        };
      } else if (chunk.type === 'tool-result') {
        yield {
          type: 'tool-result',
          toolResult: {
            toolName: chunk.toolName,
            result: chunk.result
          }
        };
      } else if (chunk.type === 'finish') {
        yield {
          type: 'finish'
        };
      }
    }
  }

  private async handleStreamCompletion(
    result: any,
    messages: ModelMessage[]
  ): Promise<RunResult<TOutput>> {
    // Use array for efficient string concatenation
    const textChunks: string[] = [];
    const toolCalls: Array<{ toolName: string; args: any; result: any }> = [];

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        textChunks.push(chunk.textDelta);
      } else if (chunk.type === 'tool-result') {
        toolCalls.push({
          toolName: chunk.toolName,
          args: chunk.args,
          result: chunk.result
        });
      }
    }
    
    // Join array at the end for efficiency
    const fullText = textChunks.join('');

    // Add assistant message
    messages.push({
      role: 'assistant',
      content: fullText
    });

    // Run output guardrails
    await this.runOutputGuardrails(fullText);

    // Save to session
    if (this.session) {
      await this.session.addMessages(messages);
    }

    // Parse output
    // Performance: Add error handling for JSON parsing
    let finalOutput: TOutput;
    if (this.agent._outputSchema) {
      try {
        const parsed = JSON.parse(fullText);
        finalOutput = this.agent._outputSchema.parse(parsed);
      } catch (error: any) {
        // Fallback: try to extract JSON from markdown code blocks
        const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            finalOutput = this.agent._outputSchema.parse(parsed);
          } catch {
            // Final fallback: return text as-is
            finalOutput = fullText as TOutput;
          }
        } else {
          // Fallback: return text as-is
          finalOutput = fullText as TOutput;
        }
      }
    } else {
      finalOutput = fullText as TOutput;
    }

    const step: StepResult = {
      stepNumber: 1,
      toolCalls,
      text: fullText
    };
    this.steps.push(step);

    if (this.agent._onStepFinish) {
      await this.agent._onStepFinish(step);
    }

    return {
      finalOutput,
      messages,
      steps: this.steps,
      metadata: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      }
    };
  }

  private async prepareMessages(
    input: string | ModelMessage[]
  ): Promise<ModelMessage[]> {
    let newMessages: ModelMessage[];

    if (typeof input === 'string') {
      newMessages = [{ role: 'user', content: input }];
    } else {
      // Smart conversion: Only convert if messages are UIMessage[] (have 'parts' property)
      const hasUIMessageFormat = input.some((msg: any) => 'parts' in msg && Array.isArray((msg as any).parts));
      
      if (hasUIMessageFormat) {
        try {
          newMessages = convertToModelMessages(input as any);
        } catch (error) {
          if (process.env.DEBUG_MESSAGES) {
            console.warn(`[⚠️ PREPARE MESSAGES] Failed to convert UIMessage[] input, using as-is:`, error);
          }
          newMessages = input;
        }
      } else {
        // Already ModelMessage[] - use as-is
        newMessages = input;
      }
    }

    // Load session history if available
    if (this.session) {
      const history = await this.session.getHistory();
      
      // Only convert if history exists and has messages
      // Skip conversion if history is empty (common case)
      if (history.length === 0) {
        return newMessages;
      }
      
      // Cache converted messages to avoid repeated conversion
      // Only re-convert if history length changed (new messages added)
      let modelHistory: ModelMessage[];
      if (this.cachedModelMessages && history.length === this.lastHistoryLength) {
        // Reuse cached conversion
        modelHistory = this.cachedModelMessages;
      } else {
        // Smart conversion: Only convert if history is UIMessage[] (have 'parts' property)
        // Sessions return ModelMessage[] which may include UIMessage[]
        const hasUIMessageFormat = history.some((msg: any) => 'parts' in msg && Array.isArray((msg as any).parts));
        
        if (hasUIMessageFormat) {
          try {
            modelHistory = convertToModelMessages(history as any);
            // Cache the result
            this.cachedModelMessages = modelHistory;
            this.lastHistoryLength = history.length;
          } catch (error) {
            if (process.env.DEBUG_MESSAGES) {
              console.error(`[❌ PREPARE MESSAGES] Failed to convert UIMessage[] history:`, error);
            }
            // Fallback: try to use history as-is (might already be ModelMessage[])
            modelHistory = history as ModelMessage[];
          }
        } else {
          // History is already ModelMessage[] (stored as-is by sessions)
          // No normalization needed - trust the AI SDK and storage!
          modelHistory = history as ModelMessage[];
          // Cache the result
          this.cachedModelMessages = modelHistory;
          this.lastHistoryLength = history.length;
        }
      }
      
      if (this.options.sessionInputCallback) {
        const callbackResult = this.options.sessionInputCallback(modelHistory, newMessages);
        // Smart conversion: Only convert if callback result is UIMessage[]
        const hasCallbackUIFormat = callbackResult.some((msg: any) => 'parts' in msg && Array.isArray((msg as any).parts));
        
        if (hasCallbackUIFormat) {
          try {
            return convertToModelMessages(callbackResult as any);
          } catch (error) {
            if (process.env.DEBUG_MESSAGES) {
              console.warn(`[⚠️ PREPARE MESSAGES] Failed to convert UIMessage[] callback result, using as-is:`, error);
            }
            return callbackResult;
          }
        } else {
          // Already ModelMessage[] - use as-is
          return callbackResult;
        }
      }
      
      // Use concat for efficient array concatenation
      const result = modelHistory.concat(newMessages);
      return result;
    }

    return newMessages;
  }

  private async runInputGuardrails(messages: ModelMessage[]): Promise<void> {
    const inputGuardrails = this.agent._guardrails.filter(g => g.type === 'input');
    
    if (inputGuardrails.length === 0) return;
    
    // Find the last user message from conversation history
    let lastUserMessage: ModelMessage | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i];
        break;
      }
    }
    
    if (!lastUserMessage || typeof lastUserMessage.content !== 'string') return;
    
    const contextWrapper = this.getContextWrapper(this.agent, messages);
    
    // Execute all guardrails concurrently
    const results = await Promise.allSettled(
      inputGuardrails.map(g => g.validate(lastUserMessage.content as string, contextWrapper))
    );
    
    // Check all results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        throw new Error(
          `Input guardrail "${inputGuardrails[i].name}" failed (error during validation).\n` +
          `Reason: ${result.reason}\n\n` +
          `Tip: Check if the guardrail implementation has bugs or missing dependencies.`
        );
      }
      if (!result.value.passed) {
        throw new Error(
          `Input guardrail "${inputGuardrails[i].name}" blocked the request.\n` +
          `Reason: ${result.value.message}\n\n` +
          `The user input violated the guardrail policy. Review the input and guardrail configuration.`
        );
      }
    }
  }

  private async runOutputGuardrails(output: string): Promise<void> {
    const outputGuardrails = this.agent._guardrails.filter(g => g.type === 'output');
    
    if (outputGuardrails.length === 0) return;
    
    const contextWrapper = this.getContextWrapper(this.agent, []); // Empty messages for output
    
    // Execute all guardrails concurrently
    const results = await Promise.allSettled(
      outputGuardrails.map(g => g.validate(output, contextWrapper))
    );
    
    // Check all results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        throw new Error(
          `Output guardrail "${outputGuardrails[i].name}" failed (error during validation).\n` +
          `Reason: ${result.reason}\n\n` +
          `Tip: Check if the guardrail implementation has bugs or missing dependencies.`
        );
      }
      if (!result.value.passed) {
        throw new Error(
          `Output guardrail "${outputGuardrails[i].name}" blocked the response.\n` +
          `Reason: ${result.value.message}\n\n` +
          `The agent's output violated the guardrail policy. Review the agent instructions and guardrail configuration.`
        );
      }
    }
  }


  /**
   * Record agent usage metrics for tracking
   */
  private recordAgentUsage(agentName: string, tokens: { prompt: number; completion: number; total: number }, toolCallCount: number = 0): void {
    const existing = this.agentMetrics.get(agentName);
    if (existing) {
      existing.turns++;
      existing.tokens.input += tokens.prompt;
      existing.tokens.output += tokens.completion;
      existing.tokens.total += tokens.total;
      existing.toolCalls += toolCallCount;
    } else {
      this.agentMetrics.set(agentName, {
        agentName,
        turns: 1,
        tokens: {
          input: tokens.prompt,
          output: tokens.completion,
          total: tokens.total,
        },
        toolCalls: toolCallCount,
        duration: 0,
      });
    }
  }
}

// ============================================
// DEFAULT MODEL
// ============================================

let defaultModel: LanguageModel | null = null;

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
export function setDefaultModel(model: LanguageModel): void {
  defaultModel = model;
}

/**
 * Get the default model (internal use).
 * 
 * @returns {LanguageModel} The default model
 * @throws {Error} If no default model has been set
 * @internal
 */
function getDefaultModel(): LanguageModel {
  if (!defaultModel) {
    throw new Error(
      'No default model configured.\n\n' +
      'You must either:\n' +
      '  1. Set a default model: setDefaultModel(openai("gpt-4o"))\n' +
      '  2. Or provide a model in AgentConfig: new Agent({ model: openai("gpt-4o"), ... })\n\n' +
      'Example:\n' +
      '  import { openai } from "@ai-sdk/openai";\n' +
      '  import { setDefaultModel, Agent } from "@tawk-agents-sdk/core";\n\n' +
      '  setDefaultModel(openai("gpt-4o"));\n' +
      '  const agent = new Agent({ name: "MyAgent", instructions: "..." });'
    );
  }
  return defaultModel;
}

// ============================================
// UTILITY: TOOL HELPER
// ============================================

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
export function tool<TParams extends z.ZodObject<any>>(config: {
  name?: string;
  description: string;
  inputSchema: TParams;
  execute: (args: z.infer<TParams>, context?: any) => Promise<any> | any;
}): CoreTool {
  return {
    description: config.description,
    inputSchema: config.inputSchema, // AI SDK v5 uses inputSchema
    execute: config.execute
  };
}
