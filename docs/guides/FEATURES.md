# Features Guide

Key features and capabilities of Tawk Agents SDK.

## Core Features

### 1. Agent System

- **Agent Creation** - Define agents with name, instructions, and model
- **Multi-Agent Support** - Coordinate multiple specialized agents
- **Agent Handoffs** - Seamless transfer between agents
- **Dynamic Instructions** - Function-based instructions with context
- **Model Configuration** - Temperature, max tokens, top-p settings

### 2. Tool Calling

- **OpenAI-Compatible Tools** - Familiar `tool()` API
- **Zod Validation** - Type-safe parameter validation
- **Context Injection** - Automatic context passing to tools
- **Parallel Execution** - Execute multiple tools simultaneously
- **Error Handling** - Graceful tool failure recovery

### 3. Execution Modes

- **Synchronous** - Standard `run()` execution
- **Streaming** - Real-time `runStream()` with events
- **Session-Based** - Conversational with memory

## AI Capabilities

### Embeddings

Generate embeddings for semantic search:

```typescript
import { generateEmbeddingAI, createEmbeddingTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

// Single embedding
const embedding = await generateEmbeddingAI({
  model: openai.embedding('text-embedding-3-small'),
  value: 'machine learning'
});

// Batch embeddings (faster)
const embeddings = await generateEmbeddingsAI({
  model: openai.embedding('text-embedding-3-small'),
  values: ['text1', 'text2', 'text3']
});

// As a tool
const agent = new Agent({
  tools: {
    generateEmbedding: createEmbeddingTool(openai.embedding('text-embedding-3-small'))
  }
});
```

### Image Generation

Generate images from text:

```typescript
import { createImageGenerationTool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  tools: {
    generateImage: createImageGenerationTool(openai.image('dall-e-3'))
  }
});
```

### Audio

Transcription and text-to-speech:

```typescript
import { 
  createTranscriptionTool,
  createTextToSpeechTool 
} from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  tools: {
    transcribe: createTranscriptionTool(openai('whisper-1')),
    generateSpeech: createTextToSpeechTool(openai('tts-1'))
  }
});
```

### Reranking

Improve search relevance:

```typescript
import { createRerankTool } from '@tawk-agents-sdk/core';
import { cohere } from '@ai-sdk/cohere';

const agent = new Agent({
  tools: {
    rerank: createRerankTool(cohere.reranking('rerank-v3.5'))
  }
});
```

## Safety & Validation

### Guardrails

Built-in validation for safety and quality:

```typescript
import {
  contentSafetyGuardrail,
  piiDetectionGuardrail,
  lengthGuardrail,
  languageGuardrail,
  customGuardrail
} from '@tawk-agents-sdk/core';

// Guardrails are configured in AgentConfig
const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.',
  guardrails: [
    contentSafetyGuardrail({ 
      type: 'input',
      model: openai('gpt-4o-mini') 
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
    // Custom guardrail
    customGuardrail({
      name: 'business-hours',
      type: 'input',
      validate: async (content) => {
        const hour = new Date().getHours();
        return {
          passed: hour >= 9 && hour <= 17,
          message: 'Service only available 9 AM - 5 PM'
        };
      }
    })
  ]
});

const result = await run(agent, input);
```

## Session Management

### Storage Options

- **MemorySession** - In-memory (development)
- **RedisSession** - Redis-backed (production)
- **DatabaseSession** - MongoDB-backed (production)
- **HybridSession** - Redis + MongoDB (production)

```typescript
import { RedisSession, DatabaseSession, HybridSession } from '@tawk-agents-sdk/core';

// Redis
const redisSession = new RedisSession('user-123', {
  redis: redisClient,
  ttl: 3600,
  maxMessages: 50
});

// MongoDB
const dbSession = new DatabaseSession('user-123', {
  db,
  collectionName: 'sessions',
  maxMessages: 100
});

// Hybrid
const hybridSession = new HybridSession('user-123', {
  redis: redisClient,
  db,
  dbCollectionName: 'sessions',
  redisTTL: 3600,
  maxMessages: 100
});
```

## Observability

### Langfuse Tracing

Track all agent interactions:

```typescript
import { initializeLangfuse } from '@tawk-agents-sdk/core';

// Initialize once at app startup
initializeLangfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY
});

// Tracing happens automatically for all agent runs
await run(agent, 'Hello');
```

View in Langfuse dashboard:
- Token usage per agent
- Tool call timings
- Cost tracking
- Error monitoring

## Multi-Agent Patterns

### Race Agents

Run multiple agents in parallel, use fastest response:

```typescript
import { raceAgents } from '@tawk-agents-sdk/core';

const result = await raceAgents(
  [fastAgent, smartAgent, cheapAgent],
  'What is the capital of France?',
  { timeoutMs: 5000 }
);

console.log(`Winner: ${result.winningAgent.name}`);
console.log(result.finalOutput);
```

### Agent Handoffs

Coordinate specialized agents:

```typescript
const coordinator = new Agent({
  name: 'coordinator',
  model: openai('gpt-4o'),
  instructions: 'You coordinate between agents.',
  handoffs: [researchAgent, writerAgent, editorAgent]
});

// Automatically routes to the right agent
await run(coordinator, 'Write an article about AI');
```

## Advanced Features

### TOON Format

Efficient token encoding (42% reduction):

```typescript
import { encodeTOON, decodeTOON } from '@tawk-agents-sdk/core';

const data = { users: [{ id: 1, name: 'Alice' }] };
const toon = encodeTOON(data); // 42% smaller than JSON
const decoded = decodeTOON(toon);
```

### MCP Integration

Use Model Context Protocol tools:

```typescript
import { registerMCPServer, getMCPTools, getGlobalMCPManager } from '@tawk-agents-sdk/core';

await registerMCPServer({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem'],
  env: { ...process.env }
});

// Get tools from all registered servers
const mcpTools = await getMCPTools();

// Or get tools from a specific server
const manager = getGlobalMCPManager();
const filesystemTools = await manager.getServerTools('filesystem');

const agent = new Agent({
  tools: { ...mcpTools }
});
```

### Human-in-the-Loop

Require approval for critical actions:

```typescript
import { createCLIApprovalHandler, getGlobalApprovalManager } from '@tawk-agents-sdk/core';

const agent = new Agent({
  name: 'approval-agent',
  model: openai('gpt-4o'),
  instructions: 'You can perform actions that require approval.',
  tools: {
    deleteFile: {
      description: 'Delete a file (requires approval)',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => {
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

## Next Steps

- [API Reference](../reference/API.md) - Complete API documentation
- [Architecture](../reference/ARCHITECTURE.md) - System design details
- [Performance](../reference/PERFORMANCE.md) - Optimization strategies
