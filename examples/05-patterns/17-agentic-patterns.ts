/**
 * Agentic Architecture Example
 * 
 * This example demonstrates the TRUE agentic patterns:
 * 1. Agent-driven execution (not SDK-controlled)
 * 2. Parallel tool execution
 * 3. Autonomous handoffs
 * 4. Multi-agent coordination
 * 5. Agent-judging-agent patterns
 */

import { Agent, setDefaultModel } from '../core/agent';
import { run } from '../core/runner';
import { raceAgents, runParallel, runWithJudge } from '../core/coordination';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Set default model
setDefaultModel(openai('gpt-4o-mini'));

// ====================
// EXAMPLE 1: Parallel Tool Execution
// ====================

const weatherTool = {
  description: 'Get weather for a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Weather in ${city}: Sunny, 25°C`;
  },
};

const timeTool = {
  description: 'Get current time in a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Time in ${city}: 14:30`;
  },
};

const newsTool = {
  description: 'Get latest news for a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Latest news in ${city}: City prepares for festival`;
  },
};

async function example1_ParallelTools() {
  console.log('\n===== EXAMPLE 1: Parallel Tool Execution =====\n');

  const agent = new Agent({
    name: 'InfoGatherer',
    instructions: 'Gather information about a city using ALL available tools. You should call all tools to get complete information.',
    tools: {
      weather: weatherTool,
      time: timeTool,
      news: newsTool,
    },
  });

  const result = await run(agent, 'Tell me about Paris');

  console.log('Final Output:', result.finalOutput);
  console.log('\nSteps:', result.steps.length);
  console.log('Tool Calls:', result.metadata.totalToolCalls);
  console.log('Duration:', result.metadata.duration, 'ms');
  
  // With parallel execution, all tools run simultaneously
  // Expected duration: ~100ms (not 300ms sequential)
}

// ====================
// EXAMPLE 2: Autonomous Handoffs
// ====================

async function example2_AutonomousHandoffs() {
  console.log('\n===== EXAMPLE 2: Autonomous Agent Handoffs =====\n');

  const researchAgent = new Agent({
    name: 'Researcher',
    instructions: 'You research topics and gather information. When done, you should handoff to the Analyst.',
    handoffDescription: 'Handles research and information gathering',
  });

  const analysisAgent = new Agent({
    name: 'Analyst',
    instructions: 'You analyze information and provide insights. When done, you should handoff to the Reporter.',
    handoffDescription: 'Handles analysis and insights',
  });

  const reportAgent = new Agent({
    name: 'Reporter',
    instructions: 'You create final reports from analysis. This is the final step.',
    handoffDescription: 'Creates final reports',
  });

  // Configure handoffs
  researchAgent.handoffs = [analysisAgent];
  analysisAgent.handoffs = [reportAgent];

  const result = await run(researchAgent, 'Research and analyze AI safety');

  console.log('Final Output:', result.finalOutput);
  console.log('\nHandoff Chain:', result.metadata.handoffChain);
  console.log('Agents Involved:', result.metadata.handoffChain?.length);
  
  // Agent autonomously decided when to handoff (not SDK)
}

// ====================
// EXAMPLE 3: Race Agents (Parallel Agents)
// ====================

async function example3_RaceAgents() {
  console.log('\n===== EXAMPLE 3: Race Agents (Fastest Wins) =====\n');

  const fastAgent = new Agent({
    name: 'FastAgent',
    instructions: 'Answer quickly and concisely',
    model: openai('gpt-4o-mini'),
  });

  const smartAgent = new Agent({
    name: 'SmartAgent',
    instructions: 'Answer with deep analysis',
    model: openai('gpt-4o'),
  });

  const creativeAgent = new Agent({
    name: 'CreativeAgent',
    instructions: 'Answer with creative flair',
    model: openai('gpt-4o'),
  });

  const result = await raceAgents(
    [fastAgent, smartAgent, creativeAgent],
    'What is the capital of France?',
    { timeoutMs: 10000 }
  );

  console.log('Winner:', result.winningAgent.name);
  console.log('Answer:', result.finalOutput);
  console.log('Participants:', result.participantAgents);
  
  // Fastest agent wins, others are cancelled
}

// ====================
// EXAMPLE 4: Parallel Execution with Aggregation
// ====================

async function example4_ParallelWithAggregation() {
  console.log('\n===== EXAMPLE 4: Parallel Execution with Aggregation =====\n');

  const translator1 = new Agent({
    name: 'Translator1',
    instructions: 'Translate to Spanish with formal tone',
  });

  const translator2 = new Agent({
    name: 'Translator2',
    instructions: 'Translate to Spanish with casual tone',
  });

  const translator3 = new Agent({
    name: 'Translator3',
    instructions: 'Translate to Spanish with poetic style',
  });

  const result = await runParallel(
    [translator1, translator2, translator3],
    'Hello, how are you today?',
    {
      aggregator: (results) => {
        return results.map((r, i) => `Option ${i + 1}: ${r.finalOutput}`).join('\n');
      },
    }
  );

  console.log('All Translations:\n', result.aggregated);
  console.log('\nTotal Duration:', result.totalDuration, 'ms');
  
  // All agents run simultaneously, results aggregated
}

// ====================
// EXAMPLE 5: Agent-Judging-Agent Pattern
// ====================

async function example5_AgentJudging() {
  console.log('\n===== EXAMPLE 5: Agent-Judging-Agent Pattern =====\n');

  const coder1 = new Agent({
    name: 'Coder1',
    instructions: 'Write code with focus on performance',
  });

  const coder2 = new Agent({
    name: 'Coder2',
    instructions: 'Write code with focus on readability',
  });

  const coder3 = new Agent({
    name: 'Coder3',
    instructions: 'Write code with focus on security',
  });

  const judge = new Agent({
    name: 'Judge',
    instructions: `Evaluate the code solutions and pick the best one.
Consider: correctness, performance, readability, security.
Return only the best solution.`,
  });

  const result = await runWithJudge(
    [coder1, coder2, coder3],
    judge,
    'Write a function to validate email addresses'
  );

  console.log('Best Solution (judged by AI):\n', result.finalOutput);
  console.log('\nWorker Count:', result.workerResults.length);
  
  // Multiple agents compete, judge agent picks the best
}

// ====================
// EXAMPLE 6: Autonomous Decision Making
// ====================

async function example6_AutonomousDecisions() {
  console.log('\n===== EXAMPLE 6: Autonomous Decision Making =====\n');

  const searchTool = {
    description: 'Search for information',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }: { query: string }) => {
      return `Search results for: ${query}`;
    },
  };

  const calculateTool = {
    description: 'Perform calculations',
    inputSchema: z.object({ expression: z.string() }),
    execute: async ({ expression }: { expression: string }) => {
      try {
        return `Result: ${eval(expression)}`;
      } catch {
        return 'Calculation error';
      }
    },
  };

  const agent = new Agent({
    name: 'AutonomousAgent',
    instructions: `You are an autonomous agent. Decide:
- Which tools to use (if any)
- When to continue vs when to finish
- What information you need
Make your own decisions!`,
    tools: {
      search: searchTool,
      calculate: calculateTool,
    },
  });

  const result = await run(agent, 'What is 25% of 80, and why is it useful?');

  console.log('Final Output:', result.finalOutput);
  console.log('\nAgent Decisions:');
  console.log('- Tools Used:', result.metadata.totalToolCalls);
  console.log('- Steps Taken:', result.steps.length);
  console.log('- Autonomous Turns:', result.metadata.handoffChain);
  
  // Agent decided autonomously what to do (not SDK-controlled)
}

// ====================
// Run All Examples
// ====================

async function main() {
  try {
    await example1_ParallelTools();
    await example2_AutonomousHandoffs();
    await example3_RaceAgents();
    await example4_ParallelWithAggregation();
    await example5_AgentJudging();
    await example6_AutonomousDecisions();

    console.log('\n✅ All examples completed successfully!\n');
    console.log('KEY DIFFERENCES FROM OLD IMPLEMENTATION:');
    console.log('1. ✅ Tools execute in PARALLEL (not sequential)');
    console.log('2. ✅ Agents make AUTONOMOUS decisions (not SDK-controlled)');
    console.log('3. ✅ TRUE multi-agent coordination patterns');
    console.log('4. ✅ Agent-judging-agent patterns');
    console.log('5. ✅ Proper state management for interruption/resumption');
    console.log('6. ✅ Agents control their own lifecycle\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_ParallelTools,
  example2_AutonomousHandoffs,
  example3_RaceAgents,
  example4_ParallelWithAggregation,
  example5_AgentJudging,
  example6_AutonomousDecisions,
};

