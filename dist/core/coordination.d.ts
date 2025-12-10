/**
 * Agent Coordination - Multi-agent patterns and parallel execution
 *
 * This module implements true multi-agent coordination:
 * - Parallel agent execution
 * - Agent result aggregation
 * - Agent-judging-agent patterns
 * - Race conditions with proper cleanup
 *
 * @module coordination
 */
import type { Agent, RunOptions, RunResult } from './agent';
import type { ModelMessage } from 'ai';
/**
 * Options for racing multiple agents
 */
export interface RaceAgentsOptions<TContext = any> extends RunOptions<TContext> {
    timeoutMs?: number;
    signal?: AbortSignal;
}
/**
 * Result from racing agents with winner information
 */
export interface RaceResult<TOutput = string> extends RunResult<TOutput> {
    winningAgent: Agent<any, TOutput>;
    participantAgents: string[];
    participantResults?: Array<RunResult<TOutput> | null>;
}
/**
 * Options for parallel agent execution
 */
export interface ParallelAgentsOptions<TContext = any> extends RunOptions<TContext> {
    /**
     * Function to aggregate results from multiple agents
     * If not provided, returns all results
     */
    aggregator?: (results: Array<RunResult<any>>) => any;
    /**
     * Whether to fail if any agent fails
     * Default: false (collect successful results only)
     */
    failFast?: boolean;
}
/**
 * Result from parallel agent execution
 */
export interface ParallelResult<TOutput = any> {
    results: Array<RunResult<TOutput>>;
    aggregated?: any;
    failedAgents?: Array<{
        agentName: string;
        error: Error;
    }>;
    totalDuration: number;
}
/**
 * Race multiple agents - execute in parallel and return the first successful result
 *
 * This is a basic coordination pattern:
 * - All agents start simultaneously
 * - First to complete wins
 * - Other agents are aborted
 *
 * @param agents - Array of agents to race
 * @param input - User input
 * @param options - Race options
 * @returns Result from winning agent with metadata
 *
 * @example
 * ```typescript
 * const fastAgent = new Agent({ name: 'fast', model: openai('gpt-4o-mini') });
 * const smartAgent = new Agent({ name: 'smart', model: openai('gpt-4o') });
 *
 * const result = await raceAgents([fastAgent, smartAgent], 'Capital of France?');
 * console.log(`Winner: ${result.winningAgent.name}`);
 * ```
 */
export declare function raceAgents<TContext = any, TOutput = string>(agents: Agent<TContext, TOutput>[], input: string | ModelMessage[], options?: RaceAgentsOptions<TContext>): Promise<RaceResult<TOutput>>;
/**
 * Execute multiple agents in parallel and aggregate results
 *
 * This is a TRUE multi-agent coordination pattern:
 * - All agents run simultaneously
 * - Results are collected and aggregated
 * - Supports agent-judging-agent patterns
 *
 * @param agents - Array of agents to execute
 * @param input - User input (or array of inputs, one per agent)
 * @param options - Parallel execution options
 * @returns Parallel execution results
 *
 * @example
 * ```typescript
 * // Multiple agents translate in parallel
 * const translators = [agent1, agent2, agent3];
 * const result = await runParallel(translators, 'Hello world');
 *
 * // Judge the best translation
 * const judge = new Agent({ name: 'judge', instructions: 'Pick best translation' });
 * const best = await run(judge, JSON.stringify(result.results));
 * ```
 */
export declare function runParallel<TContext = any, TOutput = any>(agents: Agent<TContext, TOutput>[], input: string | ModelMessage[] | Array<string | ModelMessage[]>, options?: ParallelAgentsOptions<TContext>): Promise<ParallelResult<TOutput>>;
/**
 * Agent-judging-agent pattern: Run multiple agents and have another agent pick the best
 *
 * This is a common multi-agent coordination pattern:
 * 1. Multiple agents work on same task in parallel
 * 2. A "judge" agent evaluates all outputs
 * 3. Best output is selected
 *
 * @param workerAgents - Agents to execute the task
 * @param judgeAgent - Agent to evaluate outputs
 * @param input - User input
 * @param options - Execution options
 * @returns Best result as judged by judge agent
 *
 * @example
 * ```typescript
 * const translators = [translator1, translator2, translator3];
 * const judge = new Agent({
 *   name: 'judge',
 *   instructions: 'Evaluate translations and pick the best one'
 * });
 *
 * const best = await runWithJudge(translators, judge, 'Hello world');
 * console.log(best.finalOutput); // Best translation
 * ```
 */
export declare function runWithJudge<TContext = any, TOutput = string>(workerAgents: Agent<TContext, TOutput>[], judgeAgent: Agent<TContext, string>, input: string | ModelMessage[], options?: ParallelAgentsOptions<TContext>): Promise<RunResult<string> & {
    workerResults: Array<RunResult<TOutput>>;
}>;
/**
 * Hierarchical agent pattern: Coordinator delegates to specialist agents
 *
 * @param coordinatorAgent - Agent that delegates tasks
 * @param specialistAgents - Specialist agents with handoffs
 * @param input - User input
 * @param options - Execution options
 * @returns Final result from coordinator
 *
 * @example
 * ```typescript
 * const coordinator = new Agent({
 *   name: 'coordinator',
 *   handoffs: [researchAgent, analysisAgent, reportAgent]
 * });
 *
 * const result = await runHierarchical(coordinator, input);
 * ```
 */
export declare function runHierarchical<TContext = any, TOutput = string>(coordinatorAgent: Agent<TContext, TOutput>, input: string | ModelMessage[], options?: RunOptions<TContext>): Promise<RunResult<TOutput>>;
//# sourceMappingURL=coordination.d.ts.map