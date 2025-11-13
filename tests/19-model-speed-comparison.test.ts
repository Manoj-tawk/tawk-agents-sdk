/**
 * Test 19: Multi-Provider Speed Comparison
 * 
 * Tests speed across OpenAI, Anthropic, Google, Groq, Mistral
 * Finds the fastest model for production use
 */

import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { Agent, run } from '../src';

console.log('\n⚡ TEST 19: Multi-Provider Speed Comparison\n');
console.log('='.repeat(70));

interface BenchmarkResult {
  provider: string;
  model: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  tokensPerSecond?: number;
  cost?: string;
  reliability: string;
}

async function benchmarkModel(
  provider: string,
  modelName: string,
  modelInstance: any,
  runs: number = 3
): Promise<BenchmarkResult> {
  console.log(`\n📊 Testing ${provider} - ${modelName}`);
  console.log('-'.repeat(70));
  
  const times: number[] = [];
  let failed = 0;
  
  const agent = new Agent({
    name: 'BenchmarkAgent',
    model: modelInstance,
    instructions: 'Be concise. Answer in 1-2 sentences max.',
  });
  
  const testQuestions = [
    'What is AI?',
    'Explain quantum computing briefly.',
    'What is the capital of France?',
  ];
  
  for (let i = 0; i < runs; i++) {
    try {
      const start = Date.now();
      await run(agent, testQuestions[i % testQuestions.length]);
      const duration = Date.now() - start;
      times.push(duration);
      console.log(`   Run ${i + 1}: ${duration}ms ✅`);
    } catch (error: any) {
      failed++;
      console.log(`   Run ${i + 1}: FAILED ❌ (${error.message})`);
    }
  }
  
  if (times.length === 0) {
    return {
      provider,
      model: modelName,
      avgTime: Infinity,
      minTime: Infinity,
      maxTime: Infinity,
      reliability: 'FAILED',
    };
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  let reliability = 'EXCELLENT';
  if (failed > 0) reliability = 'GOOD';
  if (failed >= runs / 2) reliability = 'POOR';
  
  console.log(`   ⚡ Average: ${avgTime.toFixed(0)}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);
  
  return {
    provider,
    model: modelName,
    avgTime,
    minTime,
    maxTime,
    reliability,
  };
}

async function test19() {
  const results: BenchmarkResult[] = [];
  
  console.log('\n🏆 TESTING ALL PROVIDERS\n');
  
  // OpenAI Models
  if (process.env.OPENAI_API_KEY) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    OPENAI MODELS                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    try {
      results.push(await benchmarkModel('OpenAI', 'gpt-4o', openai('gpt-4o')));
    } catch (e: any) {
      console.log(`   ❌ gpt-4o failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('OpenAI', 'gpt-4o-mini', openai('gpt-4o-mini')));
    } catch (e: any) {
      console.log(`   ❌ gpt-4o-mini failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('OpenAI', 'gpt-3.5-turbo', openai('gpt-3.5-turbo')));
    } catch (e: any) {
      console.log(`   ❌ gpt-3.5-turbo failed: ${e.message}`);
    }
  } else {
    console.log('\n⚠️  OpenAI API key not found, skipping...');
  }
  
  // Anthropic Models
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   ANTHROPIC MODELS                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    try {
      results.push(await benchmarkModel('Anthropic', 'claude-3-5-sonnet', anthropic('claude-3-5-sonnet-20241022')));
    } catch (e: any) {
      console.log(`   ❌ claude-3-5-sonnet failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Anthropic', 'claude-3-5-haiku', anthropic('claude-3-5-haiku-20241022')));
    } catch (e: any) {
      console.log(`   ❌ claude-3-5-haiku failed: ${e.message}`);
    }
  } else {
    console.log('\n⚠️  Anthropic API key not found, skipping...');
  }
  
  // Google Models
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    GOOGLE MODELS                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    try {
      results.push(await benchmarkModel('Google', 'gemini-2.0-flash', google('gemini-2.0-flash-exp')));
    } catch (e: any) {
      console.log(`   ❌ gemini-2.0-flash failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Google', 'gemini-1.5-flash', google('gemini-1.5-flash')));
    } catch (e: any) {
      console.log(`   ❌ gemini-1.5-flash failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Google', 'gemini-1.5-pro', google('gemini-1.5-pro')));
    } catch (e: any) {
      console.log(`   ❌ gemini-1.5-pro failed: ${e.message}`);
    }
  } else {
    console.log('\n⚠️  Google API key not found, skipping...');
  }
  
  // Groq Models (Ultra Fast!)
  if (process.env.GROQ_API_KEY) {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     GROQ MODELS (FAST!)                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    try {
      results.push(await benchmarkModel('Groq', 'llama-3.3-70b', groq('llama-3.3-70b-versatile') as any));
    } catch (e: any) {
      console.log(`   ❌ llama-3.3-70b failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Groq', 'llama-3.1-70b', groq('llama-3.1-70b-versatile') as any));
    } catch (e: any) {
      console.log(`   ❌ llama-3.1-70b failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Groq', 'llama-3.1-8b', groq('llama-3.1-8b-instant') as any));
    } catch (e: any) {
      console.log(`   ❌ llama-3.1-8b failed: ${e.message}`);
    }
    
    try {
      results.push(await benchmarkModel('Groq', 'mixtral-8x7b', groq('mixtral-8x7b-32768') as any));
    } catch (e: any) {
      console.log(`   ❌ mixtral-8x7b failed: ${e.message}`);
    }
  } else {
    console.log('\n⚠️  Groq API key not found, skipping...');
  }
  
  // Sort by speed
  results.sort((a, b) => a.avgTime - b.avgTime);
  
  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('🏆 FINAL RANKINGS - FASTEST TO SLOWEST');
  console.log('='.repeat(70));
  
  console.log('\n┌────┬─────────────┬──────────────────────┬──────────┬────────────┐');
  console.log('│ #  │ Provider    │ Model                │ Speed    │ Status     │');
  console.log('├────┼─────────────┼──────────────────────┼──────────┼────────────┤');
  
  results.forEach((result, index) => {
    const rank = (index + 1).toString().padStart(2);
    const provider = result.provider.padEnd(11);
    const model = result.model.padEnd(20);
    const speed = result.avgTime === Infinity ? 'FAILED'.padEnd(8) : `${result.avgTime.toFixed(0)}ms`.padEnd(8);
    const status = result.reliability.padEnd(10);
    
    let emoji = '  ';
    if (index === 0) emoji = '🥇';
    if (index === 1) emoji = '🥈';
    if (index === 2) emoji = '🥉';
    if (result.avgTime === Infinity) emoji = '❌';
    
    console.log(`│ ${rank} │ ${provider} │ ${model} │ ${speed} │ ${status} │ ${emoji}`);
  });
  
  console.log('└────┴─────────────┴──────────────────────┴──────────┴────────────┘');
  
  // Recommendations
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  const fastest = results.filter(r => r.avgTime < Infinity).slice(0, 3);
  const cheapest = results.filter(r => r.provider === 'Groq' || r.provider === 'Google');
  const balanced = results.filter(r => r.avgTime < 2000 && r.reliability === 'EXCELLENT');
  
  console.log('\n🚀 FASTEST (Speed Priority):');
  fastest.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.provider} ${r.model} - ${r.avgTime.toFixed(0)}ms`);
  });
  
  console.log('\n💰 BEST VALUE (Speed + Cost):');
  cheapest.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.provider} ${r.model} - ${r.avgTime.toFixed(0)}ms (FREE or cheap)`);
  });
  
  console.log('\n⚖️  BEST BALANCED (Speed + Quality + Reliability):');
  balanced.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.provider} ${r.model} - ${r.avgTime.toFixed(0)}ms`);
  });
  
  console.log('\n🎯 PRODUCTION RECOMMENDATION:');
  console.log('='.repeat(70));
  
  if (fastest.length > 0) {
    const winner = fastest[0];
    console.log(`\n✅ USE: ${winner.provider} "${winner.model}"`);
    console.log(`   Speed: ${winner.avgTime.toFixed(0)}ms (${((1000 / winner.avgTime) * 60).toFixed(0)} requests/min)`);
    console.log(`   Reliability: ${winner.reliability}`);
    
    console.log('\n📝 Implementation:');
    console.log('```typescript');
    
    if (winner.provider === 'Groq') {
      console.log(`import { groq } from '@ai-sdk/groq';`);
      console.log(`\nconst agent = new Agent({`);
      console.log(`  name: 'FastAgent',`);
      console.log(`  model: groq('${winner.model === 'llama-3.3-70b' ? 'llama-3.3-70b-versatile' : winner.model}'),`);
      console.log(`  instructions: 'Your instructions here',`);
      console.log(`});`);
    } else if (winner.provider === 'Google') {
      console.log(`import { google } from '@ai-sdk/google';`);
      console.log(`\nconst agent = new Agent({`);
      console.log(`  name: 'FastAgent',`);
      console.log(`  model: google('${winner.model}'),`);
      console.log(`  instructions: 'Your instructions here',`);
      console.log(`});`);
    } else if (winner.provider === 'Anthropic') {
      console.log(`import { anthropic } from '@ai-sdk/anthropic';`);
      console.log(`\nconst agent = new Agent({`);
      console.log(`  name: 'FastAgent',`);
      console.log(`  model: anthropic('${winner.model}'),`);
      console.log(`  instructions: 'Your instructions here',`);
      console.log(`});`);
    } else {
      console.log(`import { openai } from '@ai-sdk/openai';`);
      console.log(`\nconst agent = new Agent({`);
      console.log(`  name: 'FastAgent',`);
      console.log(`  model: openai('${winner.model}'),`);
      console.log(`  instructions: 'Your instructions here',`);
      console.log(`});`);
    }
    console.log('```');
  }
  
  console.log('\n💡 PRO TIPS:');
  console.log('-'.repeat(70));
  console.log('1. Groq is usually FASTEST (hardware acceleration)');
  console.log('2. Google Gemini Flash is fast + FREE (high quota)');
  console.log('3. Claude Haiku is fast + high quality');
  console.log('4. Combine with streaming for best UX');
  console.log('5. Use faster models for 90% of queries, reserve GPT-4o for complex tasks');
  
  console.log('\n✅ TEST 19 COMPLETE!\n');
}

test19().catch(console.error);

