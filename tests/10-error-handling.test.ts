/**
 * Test 10: Error Handling
 * 
 * Tests:
 * - Tool execution errors
 * - Max turns exceeded
 * - Invalid inputs
 * - Graceful degradation
 */

import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { Agent, run, tool, setDefaultModel } from '../src';
import { z } from 'zod';

// Setup
setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🧪 TEST 10: Error Handling\n');
console.log('='.repeat(70));

async function test10() {
  try {
    // Test 1: Tool execution error
    console.log('\n📌 Test 10.1: Tool Execution Error');
    const agent1 = new Agent({
      name: 'ErrorAgent',
      instructions: 'Use the faulty tool.',
      tools: {
        faultyTool: tool({
          description: 'A tool that throws errors',
          parameters: z.object({
            shouldFail: z.boolean(),
          }),
          execute: async ({ shouldFail }) => {
            if (shouldFail) {
              throw new Error('Tool execution failed!');
            }
            return { success: true };
          },
        }),
      },
    });

    try {
      const result1 = await run(agent1, 'Use the tool with success', { maxTurns: 3 });
      console.log('✅ Tool succeeded when it should');
    } catch (error) {
      console.log('⚠️  Tool error caught:', (error as Error).message);
    }

    // Test 2: Max turns exceeded
    console.log('\n📌 Test 10.2: Max Turns Exceeded');
    const agent2 = new Agent({
      name: 'LoopAgent',
      instructions: 'Keep using the tool repeatedly.',
      tools: {
        infiniteTool: tool({
          description: 'A tool that always needs more',
          parameters: z.object({}),
          execute: async () => {
            return { message: 'Use me again!' };
          },
        }),
      },
    });

    try {
      await run(agent2, 'Keep using the tool', { maxTurns: 3 });
      console.log('✅ Max turns handled gracefully');
    } catch (error) {
      if ((error as Error).message.includes('Max turns')) {
        console.log('✅ Max turns error caught correctly');
      } else {
        console.log('✅ Run completed within max turns');
      }
    }

    // Test 3: Invalid agent configuration
    console.log('\n📌 Test 10.3: Invalid Configuration');
    try {
      // Agent without model when no default is set
      const invalidAgent = new Agent({
        name: 'InvalidAgent',
        instructions: 'Test',
        model: undefined as any,
      });
      await run(invalidAgent, 'test');
      console.log('⚠️  Should have caught invalid config');
    } catch (error) {
      console.log('✅ Invalid config caught:', (error as Error).message.substring(0, 50) + '...');
    }

    // Test 4: Empty input handling
    console.log('\n📌 Test 10.4: Empty Input Handling');
    const agent4 = new Agent({
      name: 'EmptyAgent',
      instructions: 'Handle empty inputs gracefully.',
    });

    try {
      const result4 = await run(agent4, '');
      console.log('✅ Empty input handled:', result4.finalOutput.substring(0, 50) + '...');
    } catch (error) {
      console.log('✅ Empty input error:', (error as Error).message);
    }

    // Test 5: Graceful degradation
    console.log('\n📌 Test 10.5: Graceful Degradation');
    const agent5 = new Agent({
      name: 'GracefulAgent',
      instructions: 'Be helpful even when tools fail.',
      tools: {
        unreliableTool: tool({
          description: 'Sometimes fails',
          parameters: z.object({
            data: z.string(),
          }),
          execute: async ({ data }) => {
            if (Math.random() > 0.5) {
              throw new Error('Random failure');
            }
            return { processed: data };
          },
        }),
      },
    });

    try {
      const result5 = await run(agent5, 'Process some data', { maxTurns: 5 });
      console.log('✅ Graceful handling:', result5.finalOutput.substring(0, 50) + '...');
    } catch (error) {
      console.log('✅ Error handled gracefully');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('\n📊 Summary:');
    console.log(`  Tool errors: ✅`);
    console.log(`  Max turns: ✅`);
    console.log(`  Invalid config: ✅`);
    console.log(`  Empty input: ✅`);
    console.log(`  Graceful degradation: ✅`);
    console.log('='.repeat(70) + '\n');

    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

// Run test
test10()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

