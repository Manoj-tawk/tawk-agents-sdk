# Tawk Agents SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
- 🔍 **AI Features** - Embeddings, Image Generation, Audio (TTS/STT), Reranking

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Manoj-tawk/tawk-agents-sdk.git
cd tawk-agents-sdk
npm install
```

Install your preferred AI provider (optional):

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
  handoffs: [researchAgent, writerAgent]
});

const result = await run(coordinator, 'Write an article about AI agents');
```

### Streaming Responses

```typescript
import { Agent, runStream } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.'
});

const streamResult = await runStream(agent, 'Tell me a story');

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
  handoffs: [agent1, agent2],
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
  session: new MemorySession('session-id', 50),
  
  // Custom context (dependency injection)
  context: { userId: '123', db: database },
  
  // Max turns
  maxTurns: 10
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

// Guardrails are configured in AgentConfig, not RunOptions
const agent = new Agent({
  name: 'safe-agent',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.',
  guardrails: [
    contentSafetyGuardrail({ 
      type: 'input',
      model: openai('gpt-4o-mini'),
      categories: ['violence', 'hate-speech']
    }),
    piiDetectionGuardrail({ 
      type: 'input',
      block: true
    }),
    languageGuardrail({
      type: 'input',
      model: openai('gpt-4o-mini'),
      allowedLanguages: ['en', 'es']
    }),
    lengthGuardrail({ 
      type: 'output',
      maxLength: 1000 
    }),
    formatValidationGuardrail({ 
      type: 'output',
      format: 'json',
      schema: outputSchema 
    })
  ]
});

const result = await run(agent, userMessage);
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

const session = new MemorySession('user-123', 50); // id, maxMessages

await run(agent, 'Hello', { session });
await run(agent, 'What did I just say?', { session });
```

#### Redis Session

```typescript
import { RedisSession } from '@tawk-agents-sdk/core';
import Redis from 'ioredis';

const redis = new Redis();
const session = new RedisSession('user-123', {
  redis,
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

const session = new DatabaseSession('user-123', {
  db,
  collectionName: 'sessions',
  maxMessages: 100
});

await run(agent, 'Hello', { session });
```

#### Hybrid Session (Redis + MongoDB)

```typescript
import { HybridSession } from '@tawk-agents-sdk/core';

const session = new HybridSession('user-123', {
  redis,
  db,
  dbCollectionName: 'sessions',
  redisTTL: 3600,
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

// Tracing happens automatically for all agent runs
const result = await run(agent, 'Hello');
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
  handoffs: [salesAgent, supportAgent]
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
import { openai } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';

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

console.log(`Winner: ${result.winningAgent.name}`);
console.log(result.finalOutput);
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

### 9. AI Features

#### Embeddings

```typescript
import { Agent, run, createEmbeddingTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'search-assistant',
  model: openai('gpt-4o'),
  instructions: 'You can generate embeddings for semantic search.',
  tools: {
    generateEmbedding: createEmbeddingTool(openai.embedding('text-embedding-3-small'))
  }
});

const result = await run(agent, 'Generate an embedding for "machine learning"');
```

#### Image Generation

```typescript
import { Agent, run, createImageGenerationTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'image-creator',
  model: openai('gpt-4o'),
  instructions: 'You can generate images from text descriptions.',
  tools: {
    generateImage: createImageGenerationTool(openai('dall-e-3'))
  }
});

const result = await run(agent, 'Generate an image of a sunset over mountains');
```

#### Audio Transcription

```typescript
import { Agent, run, createTranscriptionTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';
import * as fs from 'fs';

const agent = new Agent({
  name: 'transcriber',
  model: openai('gpt-4o'),
  instructions: 'You can transcribe audio files to text.',
  tools: {
    transcribe: createTranscriptionTool(openai('whisper-1'))
  }
});

const result = await run(agent, 'Transcribe this audio file', {
  context: { audioFile: fs.readFileSync('audio.mp3') }
});
```

#### Text-to-Speech

```typescript
import { Agent, run, createTextToSpeechTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'tts-assistant',
  model: openai('gpt-4o'),
  instructions: 'You can convert text to speech.',
  tools: {
    generateSpeech: createTextToSpeechTool(openai('tts-1'))
  }
});

const result = await run(agent, 'Convert "Hello world" to speech');
```

#### Reranking

```typescript
import { Agent, run, createRerankTool } from '@tawk-agents-sdk/core';
import { cohere } from '@ai-sdk/cohere';

const agent = new Agent({
  name: 'search-assistant',
  model: openai('gpt-4o'),
  instructions: 'You can rerank search results to find the most relevant documents.',
  tools: {
    rerank: createRerankTool(cohere.reranking('rerank-v3.5'))
  }
});

const result = await run(agent, 'Rerank these documents for query "AI agents"');
```

### 10. MCP (Model Context Protocol)

```typescript
import { Agent, run, registerMCPServer, getMCPTools, getGlobalMCPManager } from '@tawk-agents-sdk/core';

// Register an MCP server
await registerMCPServer({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem'],
  env: { ...process.env }
});

// Get tools from all registered MCP servers
const mcpTools = await getMCPTools();

// Or get tools from a specific server
const manager = getGlobalMCPManager();
const filesystemTools = await manager.getServerTools('filesystem');

const agent = new Agent({
  name: 'mcp-agent',
  model: openai('gpt-4o'),
  instructions: 'You have access to filesystem tools via MCP.',
  tools: {
    ...mcpTools
  }
});

const result = await run(agent, 'List files in the current directory');
```

### 11. Tool Approval (Human-in-the-Loop)

```typescript
import { Agent, run, createCLIApprovalHandler, getGlobalApprovalManager } from '@tawk-agents-sdk/core';

const agent = new Agent({
  name: 'approval-agent',
  model: openai('gpt-4o'),
  instructions: 'You can perform actions that require approval.',
  tools: {
    deleteFile: {
      description: 'Delete a file (requires approval)',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        // Request approval before executing
        const approvalManager = getGlobalApprovalManager();
        const approved = await approvalManager.requestApproval(
          'deleteFile',
          { path },
          {
            requiredForTools: ['deleteFile'],
            requestApproval: createCLIApprovalHandler()
          }
        );
        if (!approved.approved) {
          throw new Error('Approval denied');
        }
        return `File ${path} deleted`;
      }
    }
  }
});

const result = await run(agent, 'Delete important.txt');
```

### 12. Dynamic Instructions

```typescript
const agent = new Agent({
  name: 'contextual-agent',
  model: openai('gpt-4o'),
  instructions: (context) => {
    // Dynamic instructions based on context
    return `You are helping user ${context.context.userId} at ${new Date().toLocaleTimeString()}`;
  }
});
```

### 13. Dynamic Tool Enabling

```typescript
const agent = new Agent({
  name: 'conditional-tools',
  model: openai('gpt-4o'),
  tools: {
    adminTool: {
      description: 'Admin-only tool',
      enabled: (context) => {
        return context.context.userRole === 'admin';
      },
      parameters: z.object({ action: z.string() }),
      execute: async ({ action }) => `Admin action: ${action}`
    }
  }
});
```

## API Reference

### Agent

```typescript
class Agent<TContext = any, TOutput = string> {
  constructor(config: AgentConfig<TContext, TOutput>)
  
  // Static factory method
  static create<TContext, TOutput>(
    config: AgentConfig<TContext, TOutput>
  ): Agent<TContext, TOutput>
  
  // Convert agent to a tool
  asTool(options?: {
    toolName?: string;
    toolDescription?: string;
  }): CoreTool
  
  // Clone agent with overrides
  clone(overrides: Partial<AgentConfig<TContext, TOutput>>): Agent<TContext, TOutput>
  
  // Get/set handoffs
  get handoffs(): Agent<TContext, any>[]
  set handoffs(agents: Agent<TContext, any>[])
  
  readonly name: string
  readonly handoffDescription?: string
}
```

### Run Functions

```typescript
// Basic execution
function run<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[] | RunState,
  options?: RunOptions<TContext>
): Promise<RunResult<TOutput>>

// Streaming
function runStream<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[],
  options?: RunOptions<TContext>
): Promise<StreamResult<TOutput>>

// Race multiple agents
function raceAgents<TContext, TOutput>(
  agents: Agent<TContext, TOutput>[],
  input: string | CoreMessage[],
  options?: RunOptions<TContext> & { timeoutMs?: number }
): Promise<RunResult<TOutput> & { winningAgent: Agent<TContext, TOutput> }>
```

### Sessions

```typescript
interface Session<TContext = any> {
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
}

// In-memory (development/testing)
class MemorySession<TContext> implements Session<TContext> {
  constructor(id: string, maxMessages?: number, summarizationConfig?: SummarizationConfig)
}

// Redis-backed (production)
class RedisSession<TContext> implements Session<TContext> {
  constructor(id: string, config: RedisSessionConfig)
  refreshTTL(): Promise<void> // Refresh time-to-live
}

// MongoDB-backed (production)
class DatabaseSession<TContext> implements Session<TContext> {
  constructor(id: string, config: DatabaseSessionConfig)
}

// Hybrid (Redis + MongoDB)
class HybridSession<TContext> implements Session<TContext> {
  constructor(id: string, config: HybridSessionConfig)
  syncToDatabase(): Promise<void> // Manually sync Redis to MongoDB
}

// Session manager
class SessionManager {
  constructor(config: SessionManagerConfig)
  getSession<TContext>(sessionId: string): Session<TContext>
  deleteSession(sessionId: string): Promise<void>
  clearCache(): void
}
```

### Guardrails

```typescript
interface Guardrail<TContext = any> {
  name: string
  type: 'input' | 'output'
  validate(content: string, context: RunContextWrapper<TContext>): Promise<GuardrailResult> | GuardrailResult
}

interface GuardrailResult {
  passed: boolean
  message?: string
  metadata?: Record<string, any>
}

// Built-in guardrails (all require type: 'input' | 'output')
function contentSafetyGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  categories?: string[];
  threshold?: number;
}): Guardrail<TContext>

function piiDetectionGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  block?: boolean;
  categories?: string[];
}): Guardrail<TContext>

function lengthGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  minLength?: number;
  maxLength?: number;
  unit?: 'characters' | 'words' | 'tokens';
}): Guardrail<TContext>

function topicRelevanceGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  allowedTopics: string[];
  threshold?: number;
}): Guardrail<TContext>

function formatValidationGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  format: 'json' | 'xml' | 'yaml' | 'markdown';
  schema?: z.ZodSchema;
}): Guardrail<TContext>

function rateLimitGuardrail<TContext>(config: {
  name?: string;
  storage: Map<string, { count: number; resetAt: number }>;
  maxRequests: number;
  windowMs: number;
  keyExtractor: (context: RunContextWrapper<TContext>) => string;
}): Guardrail<TContext>

function languageGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  allowedLanguages: string[];
}): Guardrail<TContext>

function sentimentGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  blockedSentiments?: ('positive' | 'negative' | 'neutral')[];
  allowedSentiments?: ('positive' | 'negative' | 'neutral')[];
}): Guardrail<TContext>

function toxicityGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  threshold?: number; // 0-10 scale
}): Guardrail<TContext>

function customGuardrail<TContext>(config: {
  name: string;
  type: 'input' | 'output';
  validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}): Guardrail<TContext>
```

### TOON Format

Efficient token encoding for 42% reduction vs JSON.

```typescript
function encodeTOON(data: any): string
function decodeTOON(toonString: string): any
function formatToolResultTOON(toolName: string, result: any): string
function formatToolResultsBatch(results: Array<{ tool: string; result: any }>): string
function isTOONFormat(str: string): boolean
function smartDecode(str: string): any
function calculateTokenSavings(data: any): { jsonTokens: number; toonTokens: number; savings: number; savingsPercent: number }
```

### Langfuse Tracing

```typescript
function initializeLangfuse(config: {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
}): Langfuse | null

function shutdownLangfuse(): Promise<void>
function isLangfuseEnabled(): boolean
function flushLangfuse(): Promise<void>
```

### MCP Integration

```typescript
class MCPServerManager {
  registerServer(config: MCPServerConfig): Promise<void>
  getTools(): Promise<Record<string, ToolDefinition>>
  getServerTools(serverName: string): Promise<Record<string, ToolDefinition>>
  shutdown(): Promise<void>
}

function registerMCPServer(config: MCPServerConfig): Promise<void>
function getMCPTools(): Promise<Record<string, ToolDefinition>>
function getGlobalMCPManager(): MCPServerManager
function shutdownMCPServers(): Promise<void>
```

### Approvals

```typescript
class ApprovalManager {
  requiresApproval(toolName: string, config?: ApprovalConfig): boolean
  requestApproval(toolName: string, args: any, config: ApprovalConfig): Promise<ApprovalResponse>
  getPendingApproval(token: string): PendingApproval | undefined
  submitApproval(token: string, response: ApprovalResponse): void
  getPendingApprovals(): PendingApproval[]
  clearExpired(maxAge?: number): void
}

function getGlobalApprovalManager(): ApprovalManager
function createCLIApprovalHandler(): ApprovalConfig['requestApproval']
function createWebhookApprovalHandler(webhookUrl: string, apiKey?: string): ApprovalConfig['requestApproval']
function createAutoApproveHandler(): ApprovalConfig['requestApproval']
function createAutoRejectHandler(): ApprovalConfig['requestApproval']
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
