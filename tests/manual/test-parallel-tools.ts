/**
 * Manual Test: Parallel Tool Execution
 * 
 * This test validates that multiple tools execute in parallel (not sequentially).
 * 
 * Run: npx tsx tests/manual/test-parallel-tools.ts
 */

import 'dotenv/config';
import { Agent, run, tool } from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

console.log('🧪 Testing Parallel Tool Execution\n');

// Tool 1: Slow database query (simulated)
const databaseQuery = tool({
  description: 'Query the database',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    console.log(`  🔵 DB Query started: "${query}"`);
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    const duration = Date.now() - start;
    console.log(`  ✅ DB Query completed in ${duration}ms`);
    return { result: 'User data retrieved', duration };
  },
});

// Tool 2: Slow API call (simulated)
const apiCall = tool({
  description: 'Call external API',
  inputSchema: z.object({
    endpoint: z.string(),
  }),
  execute: async ({ endpoint }) => {
    console.log(`  🟢 API Call started: "${endpoint}"`);
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    const duration = Date.now() - start;
    console.log(`  ✅ API Call completed in ${duration}ms`);
    return { result: 'Weather data retrieved', duration };
  },
});

// Tool 3: Slow calculation (simulated)
const heavyCalculation = tool({
  description: 'Perform heavy calculation',
  inputSchema: z.object({
    data: z.string(),
  }),
  execute: async ({ data }) => {
    console.log(`  🟡 Calculation started: "${data}"`);
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    const duration = Date.now() - start;
    console.log(`  ✅ Calculation completed in ${duration}ms`);
    return { result: 'Analysis complete', duration };
  },
});

async function testParallelExecution() {
  console.log('━'.repeat(80));
  console.log('TEST 1: Parallel Tool Execution');
  console.log('━'.repeat(80));
  console.log('Expected behavior:');
  console.log('  - All 3 tools should START at roughly the same time');
  console.log('  - All 3 tools should COMPLETE at roughly the same time');
  console.log('  - Total time should be ~2 seconds (NOT ~6 seconds)');
  console.log('');

  const agent = new Agent({
    name: 'ParallelAgent',
    model: openai('gpt-4o-mini'),
    instructions: `You have access to three tools. When asked to get comprehensive data, 
    use ALL THREE tools to gather information. You must call all three tools:
    1. databaseQuery - to get user data
    2. apiCall - to get weather data  
    3. heavyCalculation - to analyze the data`,
    tools: {
      databaseQuery,
      apiCall,
      heavyCalculation,
    },
  });

  console.log('📝 Starting agent execution...\n');
  const overallStart = Date.now();

  const result = await run(
    agent,
    'Get comprehensive data: query the database for user info, call the API for weather, and perform calculations on the combined data. Use all three tools.'
  );

  const overallDuration = Date.now() - overallStart;

  console.log('\n' + '━'.repeat(80));
  console.log('RESULTS:');
  console.log('━'.repeat(80));
  console.log(`Total execution time: ${overallDuration}ms`);
  console.log('');

  // Validate parallel execution
  if (overallDuration < 4000) {
    console.log('✅ SUCCESS: Tools executed in PARALLEL');
    console.log('   (Total time < 4s indicates parallel execution)');
  } else if (overallDuration > 5000) {
    console.log('❌ FAILURE: Tools executed SEQUENTIALLY');
    console.log('   (Total time > 5s indicates sequential execution)');
  } else {
    console.log('⚠️  MARGINAL: Execution time is borderline');
  }

  console.log('');
  console.log('Final output:', result.finalOutput);
  console.log('');
}

async function testSingleTool() {
  console.log('━'.repeat(80));
  console.log('TEST 2: Single Tool Execution (Baseline)');
  console.log('━'.repeat(80));
  console.log('This establishes a baseline for single tool execution.');
  console.log('');

  const agent = new Agent({
    name: 'SingleToolAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'You have access to a database query tool. Use it when asked.',
    tools: {
      databaseQuery,
    },
  });

  console.log('📝 Starting single tool execution...\n');
  const start = Date.now();

  const result = await run(agent, 'Query the database for user data');

  const duration = Date.now() - start;

  console.log('\n' + '━'.repeat(80));
  console.log('RESULTS:');
  console.log('━'.repeat(80));
  console.log(`Total execution time: ${duration}ms`);
  console.log('Expected: ~2000-3000ms (2s tool + overhead)');
  console.log('');
  console.log('Final output:', result.finalOutput);
  console.log('');
}

async function main() {
  try {
    console.log('🚀 PARALLEL TOOL EXECUTION TEST\n');
    
    // Test 1: Multiple tools in parallel
    await testParallelExecution();
    
    // Test 2: Single tool baseline
    await testSingleTool();

    console.log('━'.repeat(80));
    console.log('✅ All tests completed!');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
