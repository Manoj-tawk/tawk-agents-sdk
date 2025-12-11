"use strict";
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
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
exports.runStream = runStream;
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
async function run(agent, input, options = {}) {
    // Import runner dynamically to avoid circular dependencies
    const { AgenticRunner } = await Promise.resolve().then(() => __importStar(require('../runner')));
    // Handle resuming from RunState (for human-in-the-loop)
    if (isRunState(input)) {
        return await resumeRun(input, options);
    }
    // Execute the agent (type assertion to handle module boundary)
    const runner = new AgenticRunner(options);
    return await runner.execute(agent, input, options);
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
async function runStream(agent, input, options = {}) {
    // Import runner dynamically to avoid circular dependencies
    const { AgenticRunner } = await Promise.resolve().then(() => __importStar(require('../runner')));
    // Create runner with streaming enabled
    const runner = new AgenticRunner({ ...options, stream: true });
    // AgenticRunner doesn't have executeStream, it returns StreamResult from execute when stream=true
    const result = await runner.execute(agent, input, options);
    // The runner should return StreamResult when stream option is true
    return result;
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
async function resumeRun(state, options = {}) {
    const { AgenticRunner } = await Promise.resolve().then(() => __importStar(require('../runner')));
    const runner = new AgenticRunner({
        ...options,
        context: state.context
    });
    return await runner.execute(state.agent, state.messages, {
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
function isRunState(input) {
    return (input &&
        typeof input === 'object' &&
        'agent' in input &&
        'messages' in input &&
        'context' in input &&
        'stepNumber' in input);
}
//# sourceMappingURL=run.js.map