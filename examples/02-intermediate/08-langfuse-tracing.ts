/**
 * Simple Langfuse Trace Test
 * 
 * Tests if traces are being sent to Langfuse properly
 */

import { Agent, run, setDefaultModel } from '../src/index';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import 'dotenv/config';

setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🧪 LANGFUSE TRACE TEST\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Simple agent
const testAgent = new Agent({
  name: 'TestAgent',
  instructions: 'You are a test agent. Keep responses very short (under 50 words).',
  tools: {
    testTool: {
      description: 'A simple test tool',
      inputSchema: z.object({ message: z.string() }),
      execute: async ({ message }) => {
        console.log(`🔧 Tool executed: ${message}`);
        return { result: `Processed: ${message}` };
      }
    }
  }
});

async function testLangfuseTracing() {
  console.log('📝 Running simple test...\n');
  
  const result = await run(
    testAgent,
    'Use the testTool with message "hello world" and then tell me the result',
    {
      maxTurns: 5
    }
  );
  
  console.log('\n✅ Test completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Results:');
  console.log('  - Final Output:', result.finalOutput);
  console.log('  - Tokens Used:', result.metadata.totalTokens);
  console.log('  - Tools Called:', result.metadata.totalToolCalls);
  console.log('\n📍 Check Langfuse Dashboard:');
  console.log('  🔗 https://us.cloud.langfuse.com');
  console.log('\n  Look for trace: "Agent Run: TestAgent"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testLangfuseTracing().catch(console.error);

