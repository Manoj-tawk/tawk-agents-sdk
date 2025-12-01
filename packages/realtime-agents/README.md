# 🎙️ Tawk Realtime Agents

**Isolated Package for Voice-Based AI Agents**

Build realtime voice agents with WebRTC and WebSocket support. This package is designed to be completely independent from the main Tawk Agents SDK for easier development and testing.

## 🚀 Features

- ✅ **WebRTC Transport** - Low-latency voice with automatic audio I/O
- ✅ **WebSocket Transport** - Universal compatibility
- ✅ **Multi-Provider Support** - OpenAI Realtime API + more
- ✅ **Voice Agent Class** - Specialized for voice interactions
- ✅ **Tool Integration** - Execute tools during voice conversations
- ✅ **Handoffs** - Transfer between voice agents
- ✅ **Event System** - Rich event streaming
- ✅ **Audio Management** - Automatic microphone/speaker handling

## 📦 Installation

```bash
npm install @tawk/realtime-agents
# or
pnpm add @tawk/realtime-agents
```

## 🎯 Quick Start

### Browser (WebRTC - Lowest Latency)

```typescript
import { RealtimeAgent, RealtimeSession } from '@tawk/realtime-agents';

const agent = new RealtimeAgent({
  name: 'VoiceAssistant',
  instructions: 'You are a helpful voice assistant',
  voice: 'alloy',
});

const session = new RealtimeSession(agent);

// Connect with ephemeral key
const { apiKey } = await fetch('/api/realtime-key').then(r => r.json());
await session.connect({ apiKey });

// Session automatically handles microphone and audio output
// Start talking!
```

### Server (WebSocket)

```typescript
import { RealtimeAgent, RealtimeSession } from '@tawk/realtime-agents';

const agent = new RealtimeAgent({
  name: 'ServerVoiceAgent',
  instructions: 'You are a server-side voice assistant',
  voice: 'echo',
});

const session = new RealtimeSession(agent, {
  transport: 'websocket',
});

await session.connect({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle audio streaming manually
session.on('audio', (audioData) => {
  // Process audio
});
```

## 🛠️ Architecture

### Transport Layers

```typescript
// WebRTC (browser, lowest latency)
const session = new RealtimeSession(agent, {
  transport: 'webrtc'  // Default in browser
});

// WebSocket (universal)
const session = new RealtimeSession(agent, {
  transport: 'websocket'  // Default on server
});

// Custom transport
const session = new RealtimeSession(agent, {
  transport: new CustomTransport()
});
```

### Voice Agents

```typescript
const agent = new RealtimeAgent({
  name: 'VoiceAgent',
  instructions: 'System prompt for voice',
  voice: 'alloy',  // Voice selection
  tools: [tool1, tool2],  // Tools for voice
  handoffs: [otherAgent],  // Voice handoffs
});
```

### Event Handling

```typescript
session.on('connected', () => {
  console.log('Session connected');
});

session.on('audio', (data) => {
  console.log('Audio received:', data.audio);
});

session.on('transcript', (data) => {
  console.log('User said:', data.text);
});

session.on('agent_response', (data) => {
  console.log('Agent said:', data.text);
});

session.on('tool_call', (data) => {
  console.log('Tool called:', data.toolName);
});

session.on('handoff', (data) => {
  console.log('Handed off to:', data.agentName);
});

session.on('error', (error) => {
  console.error('Error:', error);
});
```

## 📚 Documentation

- [Complete API Reference](./docs/API.md)
- [Transport Layers](./docs/TRANSPORT.md)
- [Voice Agent Configuration](./docs/AGENTS.md)
- [Tool Integration](./docs/TOOLS.md)
- [Examples](./examples/README.md)

## 🔧 Development

This is an isolated package for easier development:

```bash
# Install dependencies
cd packages/realtime-agents
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test
npm test
```

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core architecture
- ✅ WebSocket transport
- ✅ WebRTC transport
- ✅ Basic voice agents
- ✅ Event system

### Phase 2
- ⏳ Tool execution
- ⏳ Voice handoffs
- ⏳ Audio management
- ⏳ Browser examples

### Phase 3
- ⏳ Multi-provider support
- ⏳ Custom transports
- ⏳ Advanced audio processing
- ⏳ Production examples

## 📄 License

MIT

## 🤝 Contributing

This package is isolated for easier contribution. See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Status**: 🚧 **In Development**  
**Version**: 0.1.0  
**Target**: Q1 2026

