/**
 * 04 - Sessions (Memory)
 * 
 * Learn how to maintain conversation history and context across multiple turns.
 * Sessions allow agents to remember previous interactions.
 */

import 'dotenv/config';
import { Agent, run, MemorySession } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

async function main() {
  console.log('💬 Example 04: Sessions (Memory)\n');

  // Create an agent
  const agent = new Agent({
    name: 'ChatAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'You are a helpful assistant. Remember the conversation context.',
  });

  // Create a session for this conversation
  const session = new MemorySession<{ userId: string }>('user-123');
  session.context = { userId: 'user-123' };

  // Turn 1
  console.log('Turn 1: My name is Alice');
  const result1 = await run(agent, 'My name is Alice', { session });
  console.log('Agent:', result1.finalOutput);

  // Turn 2 - Agent should remember the name
  console.log('\nTurn 2: What is my name?');
  const result2 = await run(agent, 'What is my name?', { session });
  console.log('Agent:', result2.finalOutput);

  // Turn 3 - Agent should remember previous context
  console.log('\nTurn 3: What did I tell you in my first message?');
  const result3 = await run(agent, 'What did I tell you in my first message?', { session });
  console.log('Agent:', result3.finalOutput);

  // Show session stats
  console.log('\n📊 Session Stats:');
  console.log('Total messages:', (await session.getMessages()).length);
  console.log('User ID:', session.context.userId);

  console.log('\n✅ Sessions example complete!');
}

main().catch(console.error);


