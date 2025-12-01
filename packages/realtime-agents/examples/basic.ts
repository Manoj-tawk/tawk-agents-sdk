/**
 * Realtime Voice Assistant Example
 * 
 * Basic example of using Tawk Realtime Agents
 */

import { RealtimeAgent, RealtimeSession, hasWebRTCSupport } from '../src';
import { tool } from 'tawk-agents-sdk';
import { z } from 'zod';

// Create a weather tool
const weatherTool = tool({
  description: 'Get weather for a city',
  inputSchema: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async ({ city }) => {
    // Simulate API call
    return `The weather in ${city} is sunny and 72°F`;
  },
});

// Create realtime agent
const agent = new RealtimeAgent({
  name: 'VoiceAssistant',
  instructions: `You are a helpful voice assistant. 
    You can check the weather and answer questions.
    Be conversational and friendly.`,
  voice: 'alloy',
  tools: [weatherTool],
});

async function main() {
  console.log('🎙️ Tawk Realtime Voice Assistant\n');
  console.log(`Transport: ${hasWebRTCSupport() ? 'WebRTC' : 'WebSocket'}`);
  
  // Create session
  const session = new RealtimeSession(agent);

  // Set up event listeners
  session.on('connected', () => {
    console.log('✅ Connected to realtime service');
    console.log('🎤 Start speaking...\n');
  });

  session.on('disconnected', () => {
    console.log('\n❌ Disconnected from realtime service');
  });

  session.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  session.on('transcript', ({ text, isFinal }) => {
    if (isFinal) {
      console.log(`👤 You: ${text}`);
    }
  });

  session.on('agent_response', ({ text, isDelta }) => {
    if (isDelta) {
      process.stdout.write(text);
    } else {
      console.log(`🤖 Assistant: ${text}`);
    }
  });

  session.on('tool_call', ({ toolName, arguments: args }) => {
    console.log(`🔧 Tool called: ${toolName}(${JSON.stringify(args)})`);
  });

  session.on('tool_result', ({ toolName, result }) => {
    console.log(`✅ Tool result: ${result}`);
  });

  session.on('audio', ({ audio }) => {
    // Audio data received - would play through speakers
    // In browser, this is handled automatically by WebRTC
  });

  // Connect
  // In production, get ephemeral key from your backend
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    await session.connect({
      apiKey,
      sessionConfig: {
        voice: 'alloy',
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 500,
        },
      },
    });

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\n\n👋 Goodbye!');
      await session.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
  }
}

main().catch(console.error);

