/**
 * Race Agents - Parallel execution pattern
 *
 * Execute multiple agents in parallel and return the first successful result.
 * Useful for fallback patterns and parallel processing.
 *
 * @module race-agents
 */
import { Agent, type RunOptions, type RunResult } from './agent';
/**
 * Options for racing multiple agents in parallel.
 *
 * @template TContext - Type of context object
 *
 * @extends {RunOptions} - Inherits all standard run options
 * @property {number} [timeoutMs] - Timeout in milliseconds. If specified, the race will timeout after this duration.
 */
export interface RaceAgentsOptions<TContext = any> extends RunOptions<TContext> {
    /**
     * Timeout in milliseconds. If specified, the race will timeout after this duration.
     * @default undefined (no timeout)
     */
    timeoutMs?: number;
}
/**
 * Race multiple agents - execute in parallel and return the first successful result.
 *
 * All agents execute simultaneously. The first agent to complete successfully wins.
 * If the first agent fails, waits for other agents. If all fail, throws an error.
 *
 * @template TContext - Type of context object
 * @template TOutput - Type of output
 *
 * @param {Agent[]} agents - Array of agents to race (must have at least one)
 * @param {string | ModelMessage[]} input - Input message or messages array
 * @param {RaceAgentsOptions} [options] - Run options with optional timeout
 * @returns {Promise<RunResult & { winningAgent: Agent }>} Result from the winning agent
 *
 * @throws {Error} If no agents provided or all agents fail
 *
 * @example
 * ```typescript
 * const fastAgent = new Agent({ name: 'fast', model: openai('gpt-4o-mini') });
 * const smartAgent = new Agent({ name: 'smart', model: openai('gpt-4o') });
 *
 * const result = await raceAgents(
 *   [fastAgent, smartAgent],
 *   'What is the capital of France?',
 *   { timeoutMs: 5000 } // 5 second timeout
 * );
 *
 * console.log(`Winner: ${result.winningAgent.name}`);
 * console.log(result.finalOutput);
 * ```
 */
export declare function raceAgents<TContext = any, TOutput = string>(agents: Agent<TContext, TOutput>[], input: string | any[], options?: RaceAgentsOptions<TContext>): Promise<RunResult<TOutput> & {
    winningAgent: Agent<TContext, TOutput>;
}>;
//# sourceMappingURL=race-agents.d.ts.map