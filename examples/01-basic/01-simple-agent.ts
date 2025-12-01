/**
 * 01 - Simple Agent
 * 
 * The most basic example - a simple conversational agent.
 * Perfect starting point for learning the SDK.
 */

import 'dotenv/config';
import { Agent, run } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

async function main() {
  console.log('🤖 Example 01: Simple Agent\n');

  // Create a basic agent
  const agent = new Agent({
    name: 'Assistant',
    model: openai('gpt-4o-mini'),
    instructions: 'You are a helpful assistant. Be concise and friendly.',
  });

  // Run the agent
  const result = await run(agent, 'Hello! What can you help me with?');

  console.log('Agent Response:', result.finalOutput);
  console.log('\n✅ Simple agent example complete!');
}

main().catch(console.error);


