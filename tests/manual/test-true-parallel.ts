/**
 * Manual Test: TRUE Parallel Tool Execution
 * 
 * Forces the model to call multiple tools in a single response
 */

import 'dotenv/config';
import { Agent, run, tool } from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

console.log('🧪 Testing TRUE Parallel Tool Execution\n');

// Simple fast tools
const tool1 = tool({
  description: 'Get user name',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    console.log(`  [${new Date().toISOString()}] Tool1 START`);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  [${new Date().toISOString()}] Tool1 END`);
    return `User ${id}`;
  },
});

const tool2 = tool({
  description: 'Get user email',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    console.log(`  [${new Date().toISOString()}] Tool2 START`);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  [${new Date().toISOString()}] Tool2 END`);
    return `user${id}@example.com`;
  },
});

const tool3 = tool({
  description: 'Get user age',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    console.log(`  [${new Date().toISOString()}] Tool3 START`);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  [${new Date().toISOString()}] Tool3 END`);
    return 25;
  },
});

async function main() {
  const agent = new Agent({
    name: 'ParallelAgent',
    model: openai('gpt-4o'),
    instructions: `You MUST call ALL THREE tools in your FIRST response:
    1. tool1 to get the name
    2. tool2 to get the email  
    3. tool3 to get the age
    
    Call them ALL AT ONCE, not one at a time.`,
    tools: { tool1, tool2, tool3 },
  });

  console.log('━'.repeat(80));
  console.log('Testing: Do tools execute in parallel when model calls them together?');
  console.log('━'.repeat(80));
  console.log('If parallel: All START together, all END together (~1s total)');
  console.log('If sequential: START/END/START/END/START/END (~3s total)');
  console.log('');

  const start = Date.now();
  const result = await run(agent, 'Get ALL information for user "123" - name, email, and age. Call all tools now.');
  const duration = Date.now() - start;

  console.log('');
  console.log('━'.repeat(80));
  console.log(`Total time: ${duration}ms`);
  
  if (duration < 2000) {
    console.log('✅ PARALLEL execution confirmed!');
  } else if (duration > 2500) {
    console.log('❌ SEQUENTIAL execution detected');
  } else {
    console.log('⚠️  Borderline - check timestamps above');
  }
  
  console.log('');
  console.log('Result:', result.finalOutput);
}

main().catch(console.error);
