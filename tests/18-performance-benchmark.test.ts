/**
 * Test 18: Performance Benchmark
 * 
 * Analyzes performance bottlenecks and measures speed
 */

import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { Agent, run, tool, SessionManager } from '../src';
import { z } from 'zod';

console.log('\n⚡ TEST 18: Performance Benchmark\n');
console.log('='.repeat(70));

// Simple tool for testing
const calculator = tool({
  description: 'Simple calculator',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: a / b };
    }
  },
});

async function benchmark(name: string, fn: () => Promise<any>): Promise<number> {
  const start = Date.now();
  await fn();
  const duration = Date.now() - start;
  console.log(`   ${name}: ${duration}ms`);
  return duration;
}

async function test18() {
  console.log('\n📊 Scenario 1: Simple Question (No Tools)');
  console.log('-'.repeat(70));
  
  const simpleAgent = new Agent({
    name: 'Simple',
    model: openai('gpt-4o-mini'), // Fastest model
    instructions: 'Be concise.',
  });
  
  const times: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const time = await benchmark(`Run ${i + 1}`, async () => {
      await run(simpleAgent, 'What is 2+2?');
    });
    times.push(time);
  }
  
  const avgSimple = times.reduce((a, b) => a + b) / times.length;
  console.log(`\n   ⚡ Average: ${avgSimple.toFixed(0)}ms`);
  
  console.log('\n📊 Scenario 2: With Tool Calling');
  console.log('-'.repeat(70));
  
  const toolAgent = new Agent({
    name: 'Calculator',
    model: openai('gpt-4o-mini'),
    instructions: 'Use calculator for math.',
    tools: { calculator },
  });
  
  const toolTimes: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const time = await benchmark(`Run ${i + 1}`, async () => {
      await run(toolAgent, 'Calculate 15 * 23');
    });
    toolTimes.push(time);
  }
  
  const avgTool = toolTimes.reduce((a, b) => a + b) / toolTimes.length;
  console.log(`\n   ⚡ Average: ${avgTool.toFixed(0)}ms`);
  
  console.log('\n📊 Scenario 3: With Session (No Summarization)');
  console.log('-'.repeat(70));
  
  const sessionManager = new SessionManager({
    type: 'memory',
    maxMessages: 100,
  });
  
  const session = sessionManager.getSession('test-perf');
  const sessionTimes: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const time = await benchmark(`Run ${i + 1}`, async () => {
      await run(simpleAgent, `Question ${i + 1}`, { session });
    });
    sessionTimes.push(time);
  }
  
  const avgSession = sessionTimes.reduce((a, b) => a + b) / sessionTimes.length;
  console.log(`\n   ⚡ Average: ${avgSession.toFixed(0)}ms`);
  
  console.log('\n📊 Scenario 4: With Session + Summarization');
  console.log('-'.repeat(70));
  
  const summaryManager = new SessionManager({
    type: 'memory',
    summarization: {
      enabled: true,
      messageThreshold: 5,
      keepRecentMessages: 2,
      model: openai('gpt-4o-mini'),
    }
  });
  
  const summarySession = summaryManager.getSession('test-summary');
  
  // Warmup - add some messages
  for (let i = 0; i < 6; i++) {
    await run(simpleAgent, `Warmup ${i}`, { session: summarySession });
  }
  
  const summaryTimes: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const time = await benchmark(`Run ${i + 1}`, async () => {
      await run(simpleAgent, `Question ${i}`, { session: summarySession });
    });
    summaryTimes.push(time);
  }
  
  const avgSummary = summaryTimes.reduce((a, b) => a + b) / summaryTimes.length;
  console.log(`\n   ⚡ Average: ${avgSummary.toFixed(0)}ms`);
  
  console.log('\n📊 Scenario 5: GPT-4o vs GPT-4o-mini Speed');
  console.log('-'.repeat(70));
  
  const gpt4Agent = new Agent({
    name: 'GPT4',
    model: openai('gpt-4o'),
    instructions: 'Be concise.',
  });
  
  const gpt4Time = await benchmark('GPT-4o', async () => {
    await run(gpt4Agent, 'Explain AI in one sentence');
  });
  
  const miniTime = await benchmark('GPT-4o-mini', async () => {
    await run(simpleAgent, 'Explain AI in one sentence');
  });
  
  console.log(`\n   📈 Speed difference: ${((gpt4Time / miniTime) * 100 - 100).toFixed(0)}% slower`);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n1. Simple Query (no tools):        ${avgSimple.toFixed(0)}ms`);
  console.log(`2. With Tool Calling:              ${avgTool.toFixed(0)}ms (+${(avgTool - avgSimple).toFixed(0)}ms)`);
  console.log(`3. With Session:                   ${avgSession.toFixed(0)}ms (+${(avgSession - avgSimple).toFixed(0)}ms)`);
  console.log(`4. With Session + Summarization:   ${avgSummary.toFixed(0)}ms (+${(avgSummary - avgSimple).toFixed(0)}ms)`);
  console.log(`5. GPT-4o vs GPT-4o-mini:          ${gpt4Time.toFixed(0)}ms vs ${miniTime.toFixed(0)}ms`);
  
  console.log('\n💡 BOTTLENECK ANALYSIS:');
  console.log('='.repeat(70));
  
  // Analyze bottlenecks
  const bottlenecks = [];
  
  if (avgSimple > 2000) {
    bottlenecks.push('❌ BASE LATENCY TOO HIGH (LLM API slowness)');
  }
  
  if ((avgTool - avgSimple) > 1000) {
    bottlenecks.push('❌ TOOL CALLING OVERHEAD HIGH');
  }
  
  if ((avgSession - avgSimple) > 500) {
    bottlenecks.push('⚠️  SESSION OVERHEAD (probably OK)');
  }
  
  if ((avgSummary - avgSession) > 2000) {
    bottlenecks.push('❌ SUMMARIZATION TOO SLOW (extra LLM call)');
  }
  
  if (bottlenecks.length === 0) {
    console.log('✅ No major bottlenecks detected');
    console.log('   Speed is primarily limited by LLM API latency');
  } else {
    bottlenecks.forEach(b => console.log(b));
  }
  
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('='.repeat(70));
  
  console.log('\n1. ⚡ Use Faster Models:');
  console.log('   - gpt-4o-mini instead of gpt-4o (50-70% faster)');
  console.log('   - gpt-3.5-turbo for simple tasks (even faster)');
  
  console.log('\n2. 🚀 Enable Streaming:');
  console.log('   - User sees responses immediately (perceived speed)');
  console.log('   - runStream() instead of run()');
  
  console.log('\n3. 📦 Minimize Context Size:');
  console.log('   - Use auto-summarization (already implemented!)');
  console.log('   - Keep messageThreshold low (5-10)');
  console.log('   - Fewer tools = less context');
  
  console.log('\n4. 🔄 Parallel Tool Calls:');
  console.log('   - Let LLM call multiple tools at once');
  console.log('   - Already supported by Vercel AI SDK');
  
  console.log('\n5. 💾 Cache Responses:');
  console.log('   - Cache common queries');
  console.log('   - Use Redis for response caching');
  
  console.log('\n6. 🎯 Optimize Instructions:');
  console.log('   - Shorter instructions = faster responses');
  console.log('   - Be specific to reduce reasoning time');
  
  console.log('\n✅ TEST 18 COMPLETE!\n');
}

test18().catch(console.error);

