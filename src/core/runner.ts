/**
 * Runner - Agent-Driven Autonomous Execution Engine
 * 
 * This runner implements TRUE agentic patterns:
 * - Agents control their own execution lifecycle
 * - Parallel tool execution for performance
 * - Autonomous decision making (not SDK-controlled)
 * - Proper state management for interruption/resumption
 * - Agent coordination and handoff support
 * 
 * @module runner
 */

import { generateText, streamText, type LanguageModel, type ModelMessage } from 'ai';
import type { Agent, RunContextWrapper, Guardrail } from './agent';
import { RunState, type NextStep } from './runstate';
import { executeSingleStep, type ProcessedResponse } from './execution';
import { Usage } from './usage';
import {
  createTrace,
  isLangfuseEnabled,
  formatMessagesForLangfuse,
  extractModelName,
} from '../lifecycle/langfuse';
import {
  getCurrentTrace,
  setCurrentSpan,
  createContextualSpan,
} from '../tracing/context';
import { RunHooks } from '../lifecycle';

/**
 * Options for running an agent
 */
export interface RunOptions<TContext = any> {
  context?: TContext;
  session?: any; // Session for conversation history
  maxTurns?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

/**
 * Result of running an agent
 */
export interface RunResult<TOutput = string> {
  finalOutput: TOutput;
  messages: ModelMessage[];
  steps: any[];
  state: RunState;
  metadata: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    finishReason?: string;
    totalToolCalls: number;
    handoffChain?: string[];
    agentMetrics: any[];
    duration: number;
  };
}

/**
 * Stream result for streaming execution
 */
export interface StreamResult<TOutput = string> {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<any>;
  completed: Promise<RunResult<TOutput>>;
}

/**
 * Runner - Orchestrates agent execution with true agentic patterns
 * 
 * Key differences from old implementation:
 * 1. Agents decide when to continue/finish (not SDK)
 * 2. Tools execute in parallel (not sequential)
 * 3. Proper state management for interruption/resumption
 * 4. Agent-driven handoffs with context
 * 
 * @template TContext - Type of context object
 * @template TOutput - Type of output
 */
export class AgenticRunner<TContext = any, TOutput = string> extends RunHooks<TContext, TOutput> {
  private options: RunOptions<TContext>;

  constructor(options: RunOptions<TContext> = {}) {
    super();
    this.options = options;
  }

  /**
   * Execute an agent run with true agentic patterns
   * 
   * @param agent - The agent to execute
   * @param input - User input
   * @param options - Run options
   * @returns Run result
   */
  async execute(
    agent: Agent<TContext, TOutput>,
    input: string | ModelMessage[],
    options: RunOptions<TContext> = {}
  ): Promise<RunResult<TOutput>> {
    const mergedOptions = { ...this.options, ...options };
    const context = mergedOptions.context || ({} as TContext);
    const maxTurns = mergedOptions.maxTurns || 50;

    // Initialize run state
    const state = new RunState<TContext, Agent<TContext, TOutput>>(
      agent,
      input,
      context,
      maxTurns
    );

    // Auto-initialize Langfuse tracing
    isLangfuseEnabled();

    // Get or create trace
    let trace = getCurrentTrace();
    if (!trace && isLangfuseEnabled()) {
      const initialInput = typeof input === 'string'
        ? input
        : input.find((m) => m.role === 'user')?.content || input;

      trace = createTrace({
        name: `Agent Run: ${agent.name}`,
        input: initialInput,
        metadata: {
          agentName: agent.name,
          maxTurns,
        },
        tags: ['agent', 'run', 'agentic'],
      });
    }

    state.trace = trace;

    // Run input guardrails
    await this.runInputGuardrails(agent, state);

    // Emit agent_start event
    const contextWrapper = this.getContextWrapper(agent, state);
    this.emit('agent_start', contextWrapper, agent);
    agent.emit('agent_start', contextWrapper, agent);

    try {
      // Main agentic execution loop
      while (!state.isMaxTurnsExceeded()) {
        state.incrementTurn();

        // Create agent span if needed
        if (!state.currentAgentSpan || state.currentAgentSpan._agentName !== state.currentAgent.name) {
          if (state.currentAgentSpan) {
            state.currentAgentSpan.end();
          }

          state.currentAgentSpan = createContextualSpan(`Agent: ${state.currentAgent.name}`, {
            input: { messages: formatMessagesForLangfuse(state.messages) },
            metadata: {
              agentName: state.currentAgent.name,
              tools: Object.keys(state.currentAgent._tools || {}),
              handoffs: state.currentAgent.handoffs.map((a) => a.name),
              turn: state.currentTurn,
            },
          });
          state.currentAgentSpan._agentName = state.currentAgent.name;
          setCurrentSpan(state.currentAgentSpan);
        }

        // Get system instructions
        const systemMessage = await state.currentAgent.getInstructions(contextWrapper);

        // Get model
        const model = state.currentAgent._model;

        // Prepare tools
        const tools = state.currentAgent._tools;

        // Call model
        const modelResponse = await generateText({
          model: model as LanguageModel,
          system: systemMessage,
          messages: state.messages,
          tools: tools as any,
          temperature: state.currentAgent._modelSettings?.temperature,
          topP: state.currentAgent._modelSettings?.topP,
          maxTokens: state.currentAgent._modelSettings?.maxTokens,
          presencePenalty: state.currentAgent._modelSettings?.presencePenalty,
          frequencyPenalty: state.currentAgent._modelSettings?.frequencyPenalty,
        } as any);

        // Execute single step with AUTONOMOUS decision making
        const stepResult = await executeSingleStep(
          state.currentAgent,
          state,
          contextWrapper,
          modelResponse
        );

        // Update state with new messages
        state.messages = stepResult.messages;

        // Handle next step based on AGENT's decision
        const nextStep = stepResult.nextStep;

        if (nextStep.type === 'next_step_final_output') {
          // Agent decided to finish
          await this.runOutputGuardrails(state.currentAgent, state, nextStep.output);

          // Parse output if schema provided
          let finalOutput: TOutput;
          if (state.currentAgent._outputSchema) {
            try {
              const parsed = JSON.parse(nextStep.output);
              finalOutput = state.currentAgent._outputSchema.parse(parsed);
            } catch {
              finalOutput = nextStep.output as TOutput;
            }
          } else {
            finalOutput = nextStep.output as TOutput;
          }

          // End agent span
          if (state.currentAgentSpan) {
            state.currentAgentSpan.end({
              output: typeof finalOutput === 'string' ? finalOutput.substring(0, 500) : finalOutput,
            });
          }

          // Emit agent_end event
          this.emit('agent_end', contextWrapper, agent, finalOutput);
          agent.emit('agent_end', contextWrapper, finalOutput);

          // Return final result
          return {
            finalOutput,
            messages: state.messages,
            steps: state.steps,
            state,
            metadata: {
              totalTokens: state.usage.totalTokens,
              promptTokens: state.usage.inputTokens,
              completionTokens: state.usage.outputTokens,
              finishReason: stepResult.stepResult?.finishReason,
              totalToolCalls: state.steps.reduce((sum, s) => sum + s.toolCalls.length, 0),
              handoffChain: state.handoffChain.length > 0 ? state.handoffChain : undefined,
              agentMetrics: Array.from(state.agentMetrics.values()),
              duration: state.getDuration(),
            },
          };
        } else if (nextStep.type === 'next_step_handoff') {
          // Agent decided to handoff
          if (state.currentAgentSpan) {
            state.currentAgentSpan.end({
              output: {
                handoffTo: nextStep.newAgent.name,
                handoffReason: nextStep.reason,
              },
            });
            state.currentAgentSpan = undefined;
          }

          // Track handoff
          state.trackHandoff(nextStep.newAgent.name);

          // Switch to new agent
          const previousAgent = state.currentAgent;
          state.currentAgent = nextStep.newAgent as any;

          // Emit handoff event
          this.emit('agent_handoff', contextWrapper, previousAgent, nextStep.newAgent);
          previousAgent.emit('agent_handoff', contextWrapper, nextStep.newAgent);

          // Add handoff context to messages
          if (nextStep.reason) {
            state.messages.push({
              role: 'system',
              content: `[Handoff] Transferred to ${nextStep.newAgent.name}. Reason: ${nextStep.reason}${nextStep.context ? `. Context: ${nextStep.context}` : ''}`,
            });
          }

          // Continue loop with new agent
          continue;
        } else if (nextStep.type === 'next_step_interruption') {
          // Agent needs human approval
          state.pendingInterruptions = nextStep.interruptions;

          // Return with interruption state
          return {
            finalOutput: null as any,
            messages: state.messages,
            steps: state.steps,
            state,
            metadata: {
              totalTokens: state.usage.totalTokens,
              promptTokens: state.usage.inputTokens,
              completionTokens: state.usage.outputTokens,
              finishReason: 'interrupted',
              totalToolCalls: state.steps.reduce((sum, s) => sum + s.toolCalls.length, 0),
              handoffChain: state.handoffChain,
              agentMetrics: Array.from(state.agentMetrics.values()),
              duration: state.getDuration(),
            },
          };
        } else if (nextStep.type === 'next_step_run_again') {
          // Agent decided to continue
          continue;
        }
      }

      // Max turns exceeded
      throw new Error(`Max turns (${maxTurns}) exceeded`);
    } catch (error) {
      if (state.currentAgentSpan) {
        state.currentAgentSpan.end({
          output: { error: String(error) },
          level: 'ERROR',
        });
      }
      throw error;
    }
  }

  /**
   * Get context wrapper for tool execution
   */
  private getContextWrapper(
    agent: Agent<TContext, any>,
    state: RunState<TContext, any>
  ): RunContextWrapper<TContext> {
    return {
      context: state.context,
      agent,
      messages: state.messages,
      usage: state.usage,
    };
  }

  /**
   * Run input guardrails
   */
  private async runInputGuardrails(
    agent: Agent<TContext, any>,
    state: RunState<TContext, any>
  ): Promise<void> {
    const guardrails = agent._guardrails.filter((g) => g.type === 'input');
    if (guardrails.length === 0) return;

    const lastUserMessage = [...state.messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMessage || typeof lastUserMessage.content !== 'string') return;

    const contextWrapper = this.getContextWrapper(agent, state);

    for (const guardrail of guardrails) {
      const result = await guardrail.validate(lastUserMessage.content, contextWrapper);
      if (!result.passed) {
        throw new Error(`Input guardrail "${guardrail.name}" failed: ${result.message}`);
      }
    }
  }

  /**
   * Run output guardrails
   */
  private async runOutputGuardrails(
    agent: Agent<TContext, any>,
    state: RunState<TContext, any>,
    output: string
  ): Promise<void> {
    const guardrails = agent._guardrails.filter((g) => g.type === 'output');
    if (guardrails.length === 0) return;

    const contextWrapper = this.getContextWrapper(agent, state);

    for (const guardrail of guardrails) {
      const result = await guardrail.validate(output, contextWrapper);
      if (!result.passed) {
        throw new Error(`Output guardrail "${guardrail.name}" failed: ${result.message}`);
      }
    }
  }
}

/**
 * Run an agent with true agentic patterns
 * 
 * @param agent - Agent to execute
 * @param input - User input
 * @param options - Run options
 * @returns Run result
 */
export async function run<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  const runner = new AgenticRunner<TContext, TOutput>(options);
  return await runner.execute(agent, input, options);
}

