/**
 * E2E Test: TOON Optimization
 * 
 * Tests the useTOON agent config option to automatically encode tool results
 * to TOON format for 42% token reduction.
 */

import 'dotenv/config';
import { Agent, run, setDefaultModel, tool } from '../../src';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Set default model
setDefaultModel(openai('gpt-4o-mini'));

// Large data tool that returns a lot of JSON
const getLargeData = tool({
  description: 'Get a large dataset with many records',
  inputSchema: z.object({
    count: z.number().describe('Number of records to return')
  }),
  execute: async ({ count }: { count: number }) => {
    // Generate a large array of objects
    const data = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `This is a detailed description for item ${i + 1} with lots of text`,
      metadata: {
        category: `Category ${(i % 5) + 1}`,
        tags: [`tag${i}`, `tag${i + 1}`, `tag${i + 2}`],
        properties: {
          value: i * 10,
          active: i % 2 === 0,
          timestamp: new Date().toISOString()
        }
      }
    }));
    
    return { data, total: count };
  }
});

async function testWithTOON() {
  console.log('\n🧪 E2E TEST: TOON Optimization\n');
  console.log('⚠️  This test makes REAL API calls and costs money!\n');

  // Test 1: Without TOON (baseline)
  console.log('📍 Test 1: Agent WITHOUT TOON (baseline)');
  const agentWithoutTOON = new Agent({
    name: 'Data Agent (No TOON)',
    instructions: 'You are a data analysis agent. When you get data, summarize it briefly.',
    tools: {
      getLargeData
    },
    useTOON: false
  });

  const start1 = Date.now();
  const result1 = await run(agentWithoutTOON, 'Get 50 records and summarize them');
  const duration1 = Date.now() - start1;

  console.log(`✅ Agent: ${agentWithoutTOON.name}`);
  console.log(`📝 Response: ${result1.finalOutput.substring(0, 200)}...`);
  console.log(`📊 Tokens used: ${result1.metadata.totalTokens}`);
  console.log(`⏱️  Duration: ${duration1}ms`);

  // Test 2: With TOON (optimized)
  console.log('\n📍 Test 2: Agent WITH TOON (optimized)');
  const agentWithTOON = new Agent({
    name: 'Data Agent (TOON)',
    instructions: 'You are a data analysis agent. When you get data, summarize it briefly.',
    tools: {
      getLargeData
    },
    useTOON: true // Enable TOON encoding
  });

  const start2 = Date.now();
  const result2 = await run(agentWithTOON, 'Get 50 records and summarize them');
  const duration2 = Date.now() - start2;

  console.log(`✅ Agent: ${agentWithTOON.name}`);
  console.log(`📝 Response: ${result2.finalOutput.substring(0, 200)}...`);
  console.log(`📊 Tokens used: ${result2.metadata.totalTokens}`);
  console.log(`⏱️  Duration: ${duration2}ms`);

  // Calculate savings
  const tokenSavings = result1.metadata.totalTokens! - result2.metadata.totalTokens!;
  const tokenSavingsPercent = ((tokenSavings / result1.metadata.totalTokens!) * 100).toFixed(1);
  const costSavings = (tokenSavings * 0.00000003).toFixed(6); // Approximate cost per token

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TOON Optimization Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Without TOON: ${result1.metadata.totalTokens} tokens`);
  console.log(`With TOON:    ${result2.metadata.totalTokens} tokens`);
  console.log(`Token Savings: ${tokenSavings} tokens (${tokenSavingsPercent}%)`);
  console.log(`Cost Savings:  ~$${costSavings}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verify TOON is working (tool results should be TOON strings)
  const toolCalls1 = result1.steps.flatMap(s => s.toolCalls);
  const toolCalls2 = result2.steps.flatMap(s => s.toolCalls);
  
  if (toolCalls1.length > 0 && toolCalls2.length > 0) {
    const result1Type = typeof toolCalls1[0].result;
    const result2Type = typeof toolCalls2[0].result;
    
    console.log(`Tool result type (without TOON): ${result1Type}`);
    console.log(`Tool result type (with TOON):    ${result2Type}`);
    
    if (result2Type === 'string' && result1Type === 'object') {
      console.log('✅ TOON encoding is working! Tool results are encoded to strings.');
    } else {
      console.log('⚠️  TOON encoding may not be working as expected.');
    }
  }

  console.log('\n✅ TOON OPTIMIZATION TEST COMPLETED!\n');
}

// Run test
testWithTOON().catch(console.error);


