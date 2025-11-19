# Tawk Agents SDK

[![npm version](https://img.shields.io/npm/v/@tawk-agents-sdk/core.svg)](https://www.npmjs.com/package/@tawk-agents-sdk/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@tawk-agents-sdk/core.svg)](https://nodejs.org)

Production-ready AI agent framework with multi-agent orchestration, tool calling, guardrails, and enterprise observability.

## Features

- 🤖 **Multi-Agent Orchestration** - Coordinate specialized agents with seamless handoffs
- 🔧 **Tool Calling** - Native function tools with automatic context injection
- 🛡️ **Guardrails** - Built-in validation (PII detection, content safety, format checks)
- 📊 **Langfuse Tracing** - Complete observability and monitoring
- 💬 **Session Management** - Multiple storage options (Memory, Redis, MongoDB)
- 🔄 **Streaming Support** - Real-time response streaming
- 🎒 **TOON Format** - Efficient token encoding (42% token reduction)
- 🚀 **Multi-Provider** - OpenAI, Anthropic, Google, Groq, Mistral
- 🎯 **TypeScript First** - Complete type safety
- ⚡ **High Performance** - Parallel execution, smart caching, optimized I/O

## Installation

```bash
npm install @tawk-agents-sdk/core ai zod
```

Install your preferred AI provider:

```bash
# OpenAI
npm install @ai-sdk/openai

# Anthropic
npm install @ai-sdk/anthropic

# Google
npm install @ai-sdk/google

# Groq
npm install @ai-sdk/groq
```

## Quick Start

### Basic Agent

```typescript
import { Agent, run } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.'
});

const result = await run(agent, 'Hello!');
console.log(result.finalOutput);
```

### Agent with Tools

```typescript
import { Agent, run } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const agent = new Agent({
  name: 'calculator',
  model: openai('gpt-4o'),
  instructions: 'You are a calculator assistant.',
  tools: {
    add: {
      description: 'Add two numbers',
      parameters: z.object({
        a: z.number(),
        b: z.number()
      }),
      execute: async ({ a, b }) => a + b
    },
    multiply: {
      description: 'Multiply two numbers',
      parameters: z.object({
        a: z.number(),
        b: z.number()
      }),
      execute: async ({ a, b }) => a * b
    }
  }
});

const result = await run(agent, 'What is 15 + 23?');
console.log(result.finalOutput); // "The result is 38"
```

### Multi-Agent System

```typescript
import { Agent, run } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

// Specialized agents
const researchAgent = new Agent({
  name: 'researcher',
  model: openai('gpt-4o'),
  instructions: 'You research topics and gather information.',
  tools: { /* research tools */ }
});

const writerAgent = new Agent({
  name: 'writer',
  model: openai('gpt-4o'),
  instructions: 'You write content based on research.',
  tools: { /* writing tools */ }
});

// Coordinator agent with handoffs
const coordinator = new Agent({
  name: 'coordinator',
  model: openai('gpt-4o'),
  instructions: 'You coordinate between research and writing agents.',
  handoffAgents: [researchAgent, writerAgent]
});

const result = await run(coordinator, 'Write an article about AI agents');
```

### Streaming Responses

```typescript
import { Agent, stream } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.'
});

const streamResult = await stream(agent, 'Tell me a story');

// Stream text chunks
for await (const chunk of streamResult.textStream) {
  process.stdout.write(chunk);
}

// Or listen to events
for await (const event of streamResult.fullStream) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.textDelta);
  } else if (event.type === 'tool-call') {
    console.log('Tool called:', event.toolName);
  }
}
```

## Core Concepts

### Agent Configuration

```typescript
const agent = new Agent({
  name: 'my-agent',
  model: openai('gpt-4o'),
  instructions: 'System prompt',
  
  // Optional
  tools: { /* tool definitions */ },
  handoffAgents: [agent1, agent2],
  handoffDescription: 'When to use this agent',
  maxSteps: 10,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9
  }
});
```

### Run Options

```typescript
const result = await run(agent, 'User message', {
  // Session for conversation history
  session: new MemorySession(),
  
  // Custom context (dependency injection)
  context: { userId: '123', db: database },
  
  // Guardrails
  inputGuardrails: [contentSafetyGuardrail, piiDetectionGuardrail],
  outputGuardrails: [lengthGuardrail],
  
  // Message history
  messages: existingMessages,
  
  // Callbacks
  onStepFinish: (step) => console.log('Step done:', step),
  onToolCall: (tool) => console.log('Tool called:', tool)
});
```

## Features

### 1. Tool Calling

Tools can access context automatically:

```typescript
const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You help users with their account.',
  tools: {
    getUserData: {
      description: 'Get user data from database',
      parameters: z.object({
        userId: z.string()
      }),
      execute: async ({ userId }, context) => {
        // Context is automatically injected
        return await context.db.users.findOne({ id: userId });
      }
    }
  }
});

await run(agent, 'Show my profile', {
  context: { db: database } // Available in all tools
});
```

### 2. Guardrails

#### Built-in Guardrails

```typescript
import {
  contentSafetyGuardrail,
  piiDetectionGuardrail,
  lengthGuardrail,
  topicRelevanceGuardrail,
  formatValidationGuardrail,
  rateLimitGuardrail,
  languageGuardrail,
  sentimentGuardrail,
  toxicityGuardrail
} from '@tawk-agents-sdk/core';

const result = await run(agent, userMessage, {
  inputGuardrails: [
    contentSafetyGuardrail({ 
      model: openai('gpt-4o-mini'),
      categories: ['violence', 'hate-speech']
    }),
    piiDetectionGuardrail({ 
      model: openai('gpt-4o-mini')
    }),
    languageGuardrail({
      model: openai('gpt-4o-mini'),
      allowedLanguages: ['en', 'es']
    })
  ],
  outputGuardrails: [
    lengthGuardrail({ maxLength: 1000 }),
    formatValidationGuardrail({ 
      format: 'json',
      schema: outputSchema 
    })
  ]
});
```

#### Custom Guardrails

```typescript
import { customGuardrail } from '@tawk-agents-sdk/core';

const businessHoursGuardrail = customGuardrail({
  name: 'business-hours',
  type: 'input',
  validate: async (content, context) => {
    const hour = new Date().getHours();
    if (hour < 9 || hour > 17) {
      return {
        passed: false,
        message: 'Service only available during business hours (9 AM - 5 PM)'
      };
    }
    return { passed: true };
  }
});
```

### 3. Session Management

#### Memory Session (in-memory)

```typescript
import { MemorySession } from '@tawk-agents-sdk/core';

const session = new MemorySession();

await run(agent, 'Hello', { session });
await run(agent, 'What did I just say?', { session });
```

#### Redis Session

```typescript
import { RedisSession } from '@tawk-agents-sdk/core';
import Redis from 'ioredis';

const redis = new Redis();
const session = new RedisSession({
  redis,
  sessionId: 'user-123',
  maxMessages: 50,
  ttl: 3600
});

await run(agent, 'Hello', { session });
```

#### MongoDB Session

```typescript
import { DatabaseSession } from '@tawk-agents-sdk/core';
import { MongoClient } from 'mongodb';

const client = new MongoClient(mongoUrl);
const db = client.db('myapp');

const session = new DatabaseSession({
  collection: db.collection('sessions'),
  sessionId: 'user-123',
  maxMessages: 100
});

await run(agent, 'Hello', { session });
```

#### Hybrid Session (Redis + MongoDB)

```typescript
import { HybridSession } from '@tawk-agents-sdk/core';

const session = new HybridSession({
  redis,
  collection: db.collection('sessions'),
  sessionId: 'user-123',
  redisTtl: 3600,
  maxMessages: 100
});
```

### 4. Langfuse Tracing

Track all agent interactions:

```typescript
import { initializeLangfuse } from '@tawk-agents-sdk/core';

// Initialize once at app startup
initializeLangfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL
});

// Tracing happens automatically
const result = await run(agent, 'Hello', {
  traceName: 'user-conversation',
  traceMetadata: { userId: '123', channel: 'web' }
});
```

View traces in Langfuse dashboard with:
- Token usage per agent
- Tool call timings
- Handoff visualization
- Cost tracking
- Error monitoring

### 5. Multi-Agent Handoffs

Agents can hand off to specialized agents:

```typescript
const salesAgent = new Agent({
  name: 'sales',
  model: openai('gpt-4o'),
  instructions: 'You handle sales inquiries.',
  handoffDescription: 'Handle sales and pricing questions'
});

const supportAgent = new Agent({
  name: 'support',
  model: openai('gpt-4o'),
  instructions: 'You provide technical support.',
  handoffDescription: 'Handle technical issues and bugs'
});

const triageAgent = new Agent({
  name: 'triage',
  model: openai('gpt-4o'),
  instructions: 'You route users to the right agent.',
  handoffAgents: [salesAgent, supportAgent]
});

// Agent will automatically handoff based on query
await run(triageAgent, 'I need help with pricing');
// -> Hands off to salesAgent

await run(triageAgent, 'The app is crashing');
// -> Hands off to supportAgent
```

### 6. Race Agents

Run multiple agents in parallel and use the fastest response:

```typescript
import { raceAgents } from '@tawk-agents-sdk/core';

const fastAgent = new Agent({
  name: 'fast',
  model: openai('gpt-4o-mini'),
  instructions: 'Quick responses'
});

const smartAgent = new Agent({
  name: 'smart',
  model: openai('gpt-4o'),
  instructions: 'Detailed responses'
});

const cheapAgent = new Agent({
  name: 'cheap',
  model: groq('llama-3-70b'),
  instructions: 'Cost-effective responses'
});

const result = await raceAgents(
  [fastAgent, smartAgent, cheapAgent],
  'What is the capital of France?',
  { timeoutMs: 5000 }
);

console.log(`Winner: ${result.winnerAgent}`);
console.log(result.output);
```

### 7. TOON Format

Efficient token encoding for 42% reduction:

```typescript
import { encodeTOON, decodeTOON } from '@tawk-agents-sdk/core';

// Use in tools for efficient data transfer
const agent = new Agent({
  tools: {
    getUsers: {
      description: 'Get user list',
      parameters: z.object({}),
      execute: async () => {
        const users = await db.users.find().toArray();
        // Return TOON instead of JSON (42% smaller)
        return encodeTOON(users);
      }
    }
  }
});

// Manual encoding/decoding
const data = { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] };
const toon = encodeTOON(data);
const decoded = decodeTOON(toon);
```

### 8. Context Injection

Share data across all tools:

```typescript
interface AppContext {
  userId: string;
  db: Database;
  logger: Logger;
}

const agent = new Agent<AppContext>({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.',
  tools: {
    logAction: {
      description: 'Log user action',
      parameters: z.object({ action: z.string() }),
      execute: async ({ action }, context) => {
        // Type-safe context access
        context.logger.info('User action', {
          userId: context.userId,
          action
        });
        return 'Logged';
      }
    }
  }
});

await run(agent, 'Log my activity', {
  context: { userId: '123', db, logger }
});
```

## API Reference

### Agent

```typescript
class Agent<TContext = any, TOutput = string> {
  constructor(config: AgentConfig<TContext, TOutput>)
  
  // Convert agent to a tool
  asTool(description?: string): Tool
}
```

### Run Functions

```typescript
// Basic execution
function run<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string,
  options?: RunOptions<TContext>
): Promise<RunResult<TOutput>>

// Streaming
function stream<TContext>(
  agent: Agent<TContext>,
  input: string,
  options?: RunOptions<TContext>
): Promise<StreamResult>

// Race multiple agents
function raceAgents<TContext>(
  agents: Agent<TContext>[],
  input: string,
  options?: RunOptions<TContext> & { timeoutMs?: number }
): Promise<RaceResult>
```

### Sessions

```typescript
interface Session {
  addMessages(messages: CoreMessage[]): Promise<void>
  getHistory(): Promise<CoreMessage[]>
  clear(): Promise<void>
}

class MemorySession implements Session
class RedisSession implements Session
class DatabaseSession implements Session
class HybridSession implements Session
class SessionManager // Multi-session management
```

### Guardrails

```typescript
interface Guardrail<TContext = any> {
  name: string
  type: 'input' | 'output'
  validate(content: string, context: RunContextWrapper<TContext>): Promise<GuardrailResult>
}

// Built-in guardrails
function contentSafetyGuardrail(config): Guardrail
function piiDetectionGuardrail(config): Guardrail
function lengthGuardrail(config): Guardrail
function topicRelevanceGuardrail(config): Guardrail
function formatValidationGuardrail(config): Guardrail
function rateLimitGuardrail(config): Guardrail
function languageGuardrail(config): Guardrail
function sentimentGuardrail(config): Guardrail
function toxicityGuardrail(config): Guardrail
function customGuardrail(config): Guardrail
```

### TOON Format

```typescript
function encodeTOON(data: any): string
function decodeTOON(toonString: string): any
function formatToolResultTOON(toolName: string, result: any): string
function calculateTokenSavings(data: any): TokenSavings
```

### Langfuse

```typescript
function initializeLangfuse(config: LangfuseConfig): void
function shutdownLangfuse(): Promise<void>
function isLangfuseEnabled(): boolean
```

## Examples

See the [examples](./examples) directory for complete working examples:

- `complete-examples.ts` - Comprehensive showcase of all features
- `toon-usage.ts` - TOON format examples

## Environment Variables

```bash
# AI Provider Keys (choose one or more)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...

# Langfuse (optional, for tracing)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Redis (optional, for RedisSession)
REDIS_URL=redis://localhost:6379

# MongoDB (optional, for DatabaseSession)
MONGODB_URI=mongodb://localhost:27017/myapp
```

## TypeScript Support

The SDK is fully typed:

```typescript
import type {
  Agent,
  AgentConfig,
  RunOptions,
  RunResult,
  StreamResult,
  Tool,
  Guardrail,
  GuardrailResult,
  Session,
  CoreMessage
} from '@tawk-agents-sdk/core';
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [Tawk.to](https://www.tawk.to)

## Support

- 📧 Email: support@tawk.to
- 🐛 Issues: [GitHub Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)
- 📖 Documentation: [Full Documentation](./docs)

## Acknowledgments

Built with:
- [Vercel AI SDK v5](https://sdk.vercel.ai)
- [Langfuse](https://langfuse.com)
- [TOON Format](https://github.com/toon-format/toon)
- [Zod](https://zod.dev)

---

**Made with ❤️ by [Tawk.to](https://www.tawk.to)**
