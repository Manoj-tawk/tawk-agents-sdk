/**
 * Browser Example - Realtime Voice Chat
 * 
 * Complete browser example with UI
 */

import { RealtimeAgent, RealtimeSession } from '@tawk/realtime-agents';
import { tool } from 'tawk-agents-sdk';
import { z } from 'zod';

// Create tools
const weatherTool = tool({
  description: 'Get weather for a city',
  inputSchema: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return `Weather in ${city}: Sunny, 72°F`;
  },
});

const timeTool = tool({
  description: 'Get current time',
  inputSchema: z.object({}),
  execute: async () => {
    return new Date().toLocaleTimeString();
  },
});

// Create agent
const agent = new RealtimeAgent({
  name: 'VoiceAssistant',
  instructions: 'You are a helpful voice assistant',
  voice: 'alloy',
  tools: [weatherTool, timeTool],
});

// Create session
const session = new RealtimeSession(agent);

// UI Elements
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const transcriptDiv = document.getElementById('transcript') as HTMLDivElement;
const responseDiv = document.getElementById('response') as HTMLDivElement;

// Event listeners
session.on('connected', () => {
  statusDiv.textContent = '✅ Connected - Start speaking!';
  connectBtn.disabled = true;
  disconnectBtn.disabled = false;
});

session.on('disconnected', () => {
  statusDiv.textContent = '❌ Disconnected';
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
});

session.on('transcript', ({ text }) => {
  transcriptDiv.innerHTML += `<div class="user-message">You: ${text}</div>`;
  transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
});

session.on('agent_response', ({ text }) => {
  responseDiv.innerHTML += `<div class="agent-message">Assistant: ${text}</div>`;
  responseDiv.scrollTop = responseDiv.scrollHeight;
});

session.on('tool_call', ({ toolName, arguments: args }) => {
  responseDiv.innerHTML += `<div class="tool-call">🔧 ${toolName}(${JSON.stringify(args)})</div>`;
});

session.on('error', (error) => {
  statusDiv.textContent = `❌ Error: ${error.message}`;
});

// Connect button
connectBtn.onclick = async () => {
  try {
    // In production, get ephemeral key from your backend
    const response = await fetch('/api/realtime-key');
    const { apiKey } = await response.json();

    await session.connect({ apiKey });
  } catch (error) {
    alert('Failed to connect: ' + (error as Error).message);
  }
};

// Disconnect button
disconnectBtn.onclick = async () => {
  await session.disconnect();
};

