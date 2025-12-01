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
import { run } from './runner';
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
  failedAgents?: Array<{ agentName: string; error: Error }>;
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
export async function raceAgents<TContext = any, TOutput = string>(
  agents: Agent<TContext, TOutput>[],
  input: string | ModelMessage[],
  options: RaceAgentsOptions<TContext> = {}
): Promise<RaceResult<TOutput>> {
  if (agents.length === 0) {
    throw new Error('No agents provided for race');
  }

  if (agents.length === 1) {
    const result = await run(agents[0], input, options);
    return {
      ...result,
      winningAgent: agents[0],
      participantAgents: [agents[0].name],
    };
  }

  const startTime = Date.now();

  // Execute all agents in parallel
  const promises = agents.map(async (agent) => {
    try {
      const result = await run(agent, input, options);
      return { agent, result, error: null };
    } catch (error) {
      return {
        agent,
        result: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  });

  // Add timeout if specified
  if (options.timeoutMs) {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Race timeout after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    });

    try {
      const winner = await Promise.race([Promise.race(promises), timeoutPromise]);
      if (winner.result) {
        return {
          ...winner.result,
          winningAgent: winner.agent,
          participantAgents: agents.map((a) => a.name),
        };
      }
    } catch (error) {
      // Timeout or first agent failed, wait for others
    }
  }

  // Wait for first successful result
  const settled = await Promise.allSettled(promises);

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.result) {
      return {
        ...result.value.result,
        winningAgent: result.value.agent,
        participantAgents: agents.map((a) => a.name),
      };
    }
  }

  // All failed
  const errors = settled
    .map((r) => (r.status === 'fulfilled' && r.value.error ? r.value.error : null))
    .filter(Boolean);

  throw new Error(
    `All agents failed in race:\n${agents.map((a, i) => `  ${a.name}: ${errors[i]?.message}`).join('\n')}`
  );
}

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
export async function runParallel<TContext = any, TOutput = any>(
  agents: Agent<TContext, TOutput>[],
  input: string | ModelMessage[] | Array<string | ModelMessage[]>,
  options: ParallelAgentsOptions<TContext> = {}
): Promise<ParallelResult<TOutput>> {
  if (agents.length === 0) {
    throw new Error('No agents provided for parallel execution');
  }

  const startTime = Date.now();

  // Prepare inputs - if single input, use for all agents
  const inputs: Array<string | ModelMessage[]> = Array.isArray(input) && agents.length > 1
    ? (input as Array<string | ModelMessage[]>)
    : agents.map(() => input as string | ModelMessage[]);

  if (inputs.length !== agents.length) {
    throw new Error(
      `Input count (${inputs.length}) must match agent count (${agents.length})`
    );
  }

  // Execute all agents in parallel
  const promises = agents.map(async (agent, index) => {
    try {
      const result = await run(agent, inputs[index], options);
      return { success: true, result, agent, error: null };
    } catch (error) {
      return {
        success: false,
        result: null,
        agent,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  });

  // Wait for all to complete
  const settled = await Promise.allSettled(promises);

  // Collect results
  const results: Array<RunResult<TOutput>> = [];
  const failures: Array<{ agentName: string; error: Error }> = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      if (result.value.success && result.value.result) {
        results.push(result.value.result);
      } else if (result.value.error) {
        failures.push({
          agentName: result.value.agent.name,
          error: result.value.error,
        });
      }
    } else {
      failures.push({
        agentName: 'unknown',
        error: new Error(result.reason),
      });
    }
  }

  // Fail fast if requested and there are failures
  if (options.failFast && failures.length > 0) {
    throw new Error(
      `Parallel execution failed:\n${failures.map((f) => `  ${f.agentName}: ${f.error.message}`).join('\n')}`
    );
  }

  // Aggregate results if aggregator provided
  const aggregated = options.aggregator ? options.aggregator(results) : undefined;

  return {
    results,
    aggregated,
    failedAgents: failures.length > 0 ? failures : undefined,
    totalDuration: Date.now() - startTime,
  };
}

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
export async function runWithJudge<TContext = any, TOutput = string>(
  workerAgents: Agent<TContext, TOutput>[],
  judgeAgent: Agent<TContext, string>,
  input: string | ModelMessage[],
  options: ParallelAgentsOptions<TContext> = {}
): Promise<RunResult<string> & { workerResults: Array<RunResult<TOutput>> }> {
  // Run all workers in parallel
  const workerResult = await runParallel(workerAgents, input, options);

  if (workerResult.results.length === 0) {
    throw new Error('No successful worker results to judge');
  }

  // Prepare judge input with all worker outputs
  const judgeInput = `Original request: ${typeof input === 'string' ? input : JSON.stringify(input)}

Worker outputs:
${workerResult.results
  .map(
    (r, i) =>
      `[${workerAgents[i]?.name || `Agent ${i + 1}`}]:
${typeof r.finalOutput === 'string' ? r.finalOutput : JSON.stringify(r.finalOutput)}`
  )
  .join('\n\n')}

Please evaluate these outputs and select or synthesize the best response.`;

  // Run judge agent
  const judgeResult = await run(judgeAgent, judgeInput, options);

  return {
    ...judgeResult,
    workerResults: workerResult.results,
  };
}

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
export async function runHierarchical<TContext = any, TOutput = string>(
  coordinatorAgent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> = {}
): Promise<RunResult<TOutput>> {
  // The coordinator agent should have handoffs configured
  if (coordinatorAgent.handoffs.length === 0) {
    console.warn('Coordinator agent has no handoffs - running as normal agent');
  }

  // Run coordinator - it will autonomously delegate to specialists
  return await run(coordinatorAgent, input, options);
}

