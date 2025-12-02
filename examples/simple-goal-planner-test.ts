/**
 * Simple Goal-Planner-Reflector Test
 * 
 * A minimal example showing the multi-agent flow actually working
 */

import { Agent, run, setDefaultModel } from '../src/index';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { MemorySession } from '../src/sessions';
import 'dotenv/config';

// Set default model
setDefaultModel(openai('gpt-4o-mini'));

// ============================================
// SIMPLE 3-AGENT FLOW
// ============================================

// 1. Goal Agent - Just extracts goals
const goalAgent = new Agent({
  name: 'GoalAgent',
  instructions: `
You extract goals from user requests.

Return a JSON with:
- goals: array of goal strings
- nextAgent: "PlannerAgent" (always transfer there)

Example:
User: "Build a chatbot with RAG"
You: { "goals": ["Build chatbot", "Implement RAG"], "nextAgent": "PlannerAgent" }
  `,
  outputSchema: z.object({
    goals: z.array(z.string()),
    nextAgent: z.string()
  }),
  subagents: [] // Will set below
});

// 2. Planner Agent - Creates plan
const plannerAgent = new Agent({
  name: 'PlannerAgent',
  instructions: `
You create plans from goals.

Return a JSON with:
- plan: array of step strings
- nextAgent: "ExecutorAgent" (always transfer there)

Example:
Goals: ["Build chatbot", "Implement RAG"]
You: { "plan": ["1. Set up vector DB", "2. Create embeddings", "3. Build agent"], "nextAgent": "ExecutorAgent" }
  `,
  outputSchema: z.object({
    plan: z.array(z.string()),
    nextAgent: z.string()
  }),
  subagents: [] // Will set below
});

// 3. Executor Agent - Final response
const executorAgent = new Agent({
  name: 'ExecutorAgent',
  instructions: `
You execute plans and report results.

Based on the plan, provide a final summary of what was accomplished.

Return a JSON with:
- result: summary string
- status: "completed"
  `,
  outputSchema: z.object({
    result: z.string(),
    status: z.string()
  })
});

// Set up transfers
goalAgent.subagents = [plannerAgent];
plannerAgent.subagents = [executorAgent];

// ============================================
// TEST
// ============================================

async function test() {
  console.log('🧪 Testing Multi-Agent Flow: Goal → Planner → Executor\n');
  
  const session = new MemorySession('test-123');
  
  const result = await run(
    goalAgent,  // Start with goal agent
    'I want to build a RAG chatbot with Pinecone and deploy it to production',
    { 
      session,
      maxTurns: 15
    }
  );
  
  console.log('\n✅ RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Final Output:', JSON.stringify(result.finalOutput, null, 2));
  console.log('\n🔄 Agent Path:', result.metadata.handoffChain);
  console.log('🤖 Agents Used:', result.metadata.agentMetrics?.map(m => m.agentName).join(' → '));
  console.log('💰 Total Tokens:', result.metadata.totalTokens);
  console.log('🔧 Total Tool Calls:', result.metadata.totalToolCalls);
  console.log('⏱️  Turns:', result.steps.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n📊 Agent Details:');
  result.metadata.agentMetrics?.forEach(metric => {
    console.log(`  - ${metric.agentName}:`);
    console.log(`    Turns: ${metric.turns}`);
    console.log(`    Tokens: ${metric.totalTokens || 'N/A'}`);
  });
  
  console.log('\n📋 Session History (last 5 messages):');
  const history = await session.getHistory();
  history.slice(-5).forEach((msg, i) => {
    const content = typeof msg.content === 'string' 
      ? msg.content.substring(0, 100) 
      : JSON.stringify(msg.content).substring(0, 100);
    console.log(`  ${i + 1}. [${msg.role}] ${content}...`);
  });
  
  return result;
}

// Run test
if (require.main === module) {
  test()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { goalAgent, plannerAgent, executorAgent, test };

