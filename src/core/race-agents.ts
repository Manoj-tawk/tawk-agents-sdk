/**
 * Race Agents - Parallel execution pattern
 * 
 * Execute multiple agents in parallel and return the first successful result.
 * Useful for fallback patterns and parallel processing.
 * 
 * @module race-agents
 */

import { Agent, type RunOptions, type RunResult } from './agent';
import { run } from './agent';

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
 * @param {string | CoreMessage[]} input - Input message or messages array
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
export async function raceAgents<TContext = any, TOutput = string>(
  agents: Agent<TContext, TOutput>[],
  input: string | any[],
  options: RaceAgentsOptions<TContext> = {}
): Promise<RunResult<TOutput> & { winningAgent: Agent<TContext, TOutput> }> {
  if (agents.length === 0) {
    throw new Error('No agents provided for race');
  }

  if (agents.length === 1) {
    const result = await run(agents[0], input, options);
    return { 
      ...result, 
      winningAgent: agents[0],
      metadata: {
        ...result.metadata,
        raceWinners: [agents[0].name],
        raceParticipants: [agents[0].name],
      }
    };
  }

  // Create abort controllers for cleanup
  const controllers = agents.map(() => new AbortController());

  // Execute all agents in parallel with individual error handling
  const promises = agents.map(async (agent, index) => {
    try {
      const result = await run(agent, input, {
        ...options,
        // Note: AI SDK v5 doesn't directly support abort signals in run options
        // but we track them for future cleanup if needed
      });
      return { 
        result, 
        agent, 
        index,
        success: true 
      };
    } catch (error) {
      return { 
        result: null, 
        agent, 
        index,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  });

  // Add timeout promise if specified
  const racers: Promise<any>[] = [...promises];
  if (options.timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Race timeout after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    });
    racers.push(timeoutPromise);
  }

  // Race: wait for first completion (success or failure)
  // We use Promise.race to get the fastest result
  try {
    const winner = await Promise.race(promises);
    
    if (winner.success) {
      // Abort remaining agents (cleanup)
      controllers.forEach((controller, i) => {
        if (i !== winner.index) {
          controller.abort();
        }
      });

      return {
        ...winner.result!,
        winningAgent: winner.agent,
        metadata: {
          ...winner.result!.metadata,
          raceWinners: [winner.agent.name],
          raceParticipants: agents.map(a => a.name),
        }
      };
    }

    // If first to finish failed, wait for others with timeout
    const allResults = await Promise.race([
      Promise.allSettled(promises),
      options.timeoutMs ? new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Race timeout after ${options.timeoutMs}ms`)), options.timeoutMs)
      ) : Promise.resolve(null)
    ]) as PromiseSettledResult<any>[];

    if (!allResults) {
      throw new Error('Race failed: no results');
    }

    // Find first successful result from all settled
    for (const settled of allResults) {
      if (settled.status === 'fulfilled' && settled.value?.success) {
        const { result, agent } = settled.value;
        return { 
          ...result!, 
          winningAgent: agent,
          metadata: {
            ...result!.metadata,
            raceWinners: [agent.name],
            raceParticipants: agents.map(a => a.name),
          }
        };
      }
    }

    // If all failed, throw error with details
    const errors = allResults
      .map((r) => r.status === 'fulfilled' && !r.value.success ? r.value.error : null)
      .filter(Boolean);
    
    throw new Error(
      `All agents failed in race:\n${errors.map((e, idx) => `  ${agents[idx]?.name || `agent-${idx}`}: ${e?.message}`).join('\n')}`
    );
  } catch (error) {
    // Cleanup: abort all agents on error
    controllers.forEach(c => c.abort());
    throw error;
  }
}

