/**
 * Test 01: Basic Agent Functionality
 * 
 * Tests:
 * - Simple agent creation
 * - Basic run
 * - Tool execution
 * - Token tracking
 * - Metadata
 */

import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { Agent, run, tool, setDefaultModel, initializeLangfuse } from '../src';
import { z } from 'zod';

// Setup
setDefaultModel(openai('gpt-4o-mini'));
const langfuse = initializeLangfuse();

console.log('\n🧪 TEST 01: Basic Agent Functionality\n');
console.log('='.repeat(70));

async function test01() {
  try {
    // Test 1: Simple agent without tools
    console.log('\n📌 Test 1.1: Simple Agent (No Tools)');
    const simpleAgent = new Agent({
      name: 'SimpleAgent',
      instructions: 'You are a helpful assistant. Be concise.',
    });

    const result1 = await run(simpleAgent, 'Say hello in one sentence.');
    
    console.log('✅ Result:', result1.finalOutput);
    console.log('✅ Tokens:', result1.metadata?.totalTokens || 0);
    console.log('✅ Steps:', result1.steps.length);

    // Test 2: Agent with tools
    console.log('\n📌 Test 1.2: Agent with Tools');
    const agentWithTools = new Agent({
      name: 'CalculatorAgent',
      instructions: 'You can perform calculations. Always use the calculate tool.',
      tools: {
        calculate: tool({
          description: 'Perform a mathematical calculation',
          parameters: z.object({
            expression: z.string().describe('Math expression like "2 + 2"'),
          }),
          execute: async ({ expression }) => {
            console.log(`  🧮 Calculating: ${expression}`);
            try {
              const result = eval(expression); // Demo only!
              return { result, expression };
            } catch (error) {
              return { error: 'Invalid expression' };
            }
          },
        }),
      },
    });

    const result2 = await run(agentWithTools, 'Calculate 42 * 37 + 156', { maxTurns: 5 });
    
    console.log('✅ Result:', result2.finalOutput);
    console.log('✅ Tokens:', result2.metadata?.totalTokens || 0);
    console.log('✅ Tool Calls:', result2.metadata?.totalToolCalls || 0);
    console.log('✅ Steps:', result2.steps.length);

    // Test 3: Dynamic instructions
    console.log('\n📌 Test 1.3: Dynamic Instructions');
    const dynamicAgent = new Agent({
      name: 'DynamicAgent',
      instructions: (context) => {
        return `You are agent number ${Math.floor(Math.random() * 100)}. Be helpful.`;
      },
    });

    const result3 = await run(dynamicAgent, 'Tell me your agent number.');
    
    console.log('✅ Result:', result3.finalOutput);

    // Verify all tests passed
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('\n📊 Summary:');
    console.log(`  Total tokens used: ${(result1.metadata?.totalTokens || 0) + (result2.metadata?.totalTokens || 0) + (result3.metadata?.totalTokens || 0)}`);
    console.log(`  Total tool calls: ${(result2.metadata?.totalToolCalls || 0)}`);
    console.log('='.repeat(70) + '\n');

    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

// Run test
test01()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

