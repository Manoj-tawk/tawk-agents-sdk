/**
 * Agent Execution Functions
 * 
 * @module core/agent/run
 * @description
 * Core execution functions for running agents.
 * Provides both standard and streaming execution modes.
 * 
 * **Features**:
 * - Standard execution with run()
 * - Streaming execution with runStream()
 * - State resumption for HITL
 * - Session integration
 * - Context injection
 * 
 * @author Tawk.to
 * @license MIT
 * @version 2.0.0
 */

import type { ModelMessage } from 'ai';
import type { Agent } from './agent-class';
import type {
  RunOptions,
  RunResult,
  StreamResult,
  RunState,
} from './types';

/**
 * Execute an agent with a user message or messages.
 * This is the primary function for running agents.
 * 
 * @template TContext - Type of context object passed to tools
 * @template TOutput - Type of the agent's output
 * 
 * @param {Agent<TContext, TOutput>} agent - The agent to execute
 * @param {string | ModelMessage[] | RunState} input - User input (string, messages, or state to resume)
 * @param {RunOptions<TContext>} [options] - Execution options
 * @returns {Promise<RunResult<TOutput>>} Execution result with output and metadata
 * 
 * @example Basic Execution
 * ```typescript
 * import { Agent, run } from 'tawk-agents-sdk';
 * 
 * const agent = new Agent({
 *   name: 'Assistant',
 *   instructions: 'You are helpful.',
 *   model: openai('gpt-4')
 * });
 * 
 * const result = await run(agent, 'Hello!');
 * console.log(result.finalOutput);
 * ```
 * 
 * @example With Context and Session
 * ```typescript
 * const result = await run(agent, 'What is my balance?', {
 *   context: { 
 *     userId: '123',
 *     database: db 
 *   },
 *   session: new MemorySession('user-123'),
 *   maxTurns: 10
 * });
 * ```
 * 
 * @example Resuming from State (HITL)
 * ```typescript
 * // Save state when paused
 * const state = result.state;
 * 
 * // Resume later
 * const resumed = await run(agent, state, options);
 * ```
 */
export async function run<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[] | RunState,
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  // Import runner dynamically to avoid circular dependencies
  const { AgenticRunner } = await import('../runner');
  
  // Handle resuming from RunState (for human-in-the-loop)
  if (isRunState(input)) {
    return await resumeRun(input, options);
  }

  // Execute the agent (type assertion to handle module boundary)
  const runner = new AgenticRunner<TContext, TOutput>(options);
  return await runner.execute(agent as any, input, options);
}

/**
 * Execute an agent with streaming responses.
 * Provides real-time text chunks as they're generated.
 * 
 * @template TContext - Type of context object passed to tools
 * @template TOutput - Type of the agent's output
 * 
 * @param {Agent<TContext, TOutput>} agent - The agent to execute
 * @param {string | ModelMessage[]} input - User input (string or messages array)
 * @param {RunOptions<TContext>} [options] - Execution options
 * @returns {Promise<StreamResult<TOutput>>} Streaming result with text stream and completion promise
 * 
 * @example Stream Text Chunks
 * ```typescript
 * import { Agent, runStream } from 'tawk-agents-sdk';
 * 
 * const agent = new Agent({
 *   name: 'Storyteller',
 *   instructions: 'Tell engaging stories.',
 *   model: openai('gpt-4')
 * });
 * 
 * const stream = await runStream(agent, 'Tell me a story');
 * 
 * // Stream text as it's generated
 * for await (const chunk of stream.textStream) {
 *   process.stdout.write(chunk);
 * }
 * 
 * // Get final result
 * const result = await stream.completed;
 * console.log('\\nDone!', result.metadata);
 * ```
 * 
 * @example Stream with Full Events
 * ```typescript
 * const stream = await runStream(agent, 'Calculate 5 + 3');
 * 
 * for await (const event of stream.fullStream) {
 *   switch (event.type) {
 *     case 'text-delta':
 *       process.stdout.write(event.textDelta);
 *       break;
 *     case 'tool-call':
 *       console.log('Tool:', event.toolCall?.toolName);
 *       break;
 *     case 'tool-result':
 *       console.log('Result:', event.toolResult?.result);
 *       break;
 *   }
 * }
 * ```
 */
export async function runStream<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> = {}
): Promise<StreamResult<TOutput>> {
  // Import runner dynamically to avoid circular dependencies
  const { AgenticRunner } = await import('../runner');
  
  // Create runner with streaming enabled
  const runner = new AgenticRunner<TContext, TOutput>({ ...options, stream: true });
  
  // AgenticRunner doesn't have executeStream, it returns StreamResult from execute when stream=true
  const result = await runner.execute(agent as any, input, options);
  
  // The runner should return StreamResult when stream option is true
  return result as unknown as StreamResult<TOutput>;
}

/**
 * Resume a paused agent run from saved state.
 * Used for human-in-the-loop workflows.
 * 
 * @template TContext - Type of context object
 * @template TOutput - Type of output
 * @param {RunState} state - Saved run state
 * @param {RunOptions<TContext>} [options] - Execution options
 * @returns {Promise<RunResult<TOutput>>} Execution result
 * @internal
 */
async function resumeRun<TContext = any, TOutput = string>(
  state: RunState,
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  const { AgenticRunner } = await import('../runner');
  
  const runner = new AgenticRunner<TContext, TOutput>({
    ...options,
    context: state.context
  });
  
  return await runner.execute(state.agent as any, state.messages, {
    ...options,
    context: state.context
  });
}

/**
 * Type guard to check if input is a RunState object.
 * 
 * @param {any} input - Input to check
 * @returns {boolean} True if input is a RunState
 * @internal
 */
function isRunState(input: any): input is RunState {
  return (
    input &&
    typeof input === 'object' &&
    'agent' in input &&
    'messages' in input &&
    'context' in input &&
    'stepNumber' in input
  );
}

