# 🤖 Tawk Agents SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

**Production-ready AI agent framework with true agentic architecture, multi-agent orchestration, and enterprise observability.**

> 🚀 **New in v1.0**: True agentic architecture with parallel tool execution, dynamic HITL approvals, and native MCP integration!

## ✨ Features

- 🤖 **True Agentic Architecture** - Agent-driven autonomous decision making with parallel tool execution
- 🔧 **Tool Calling** - Native function tools with automatic context injection and parallel execution
- 👥 **Multi-Agent Orchestration** - Coordinate specialized agents with seamless handoffs
- ✅ **Dynamic HITL Approvals** - Context-aware human-in-the-loop with flexible approval policies
- 🔌 **Native MCP Integration** - Agent-level Model Context Protocol support with auto-tool discovery
- 🛡️ **Guardrails** - Built-in validation (PII detection, content safety, format checks)
- 📊 **Full Observability** - Complete Langfuse tracing (agents, tools, handoffs, approvals)
- 💬 **Session Management** - Multiple storage backends (Memory, Redis, MongoDB, Hybrid)
- 🔄 **Streaming Support** - Real-time response streaming with granular events
- 🎒 **TOON Format** - Efficient token encoding (42% reduction)
- 🚀 **Multi-Provider** - OpenAI, Anthropic, Google, Groq, Mistral via Vercel AI SDK
- 🎯 **TypeScript First** - Complete type safety
- ⚡ **High Performance** - Parallel execution, smart caching, optimized I/O

## 📦 Installation

```bash
npm install tawk-agents-sdk
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

## 🚀 Quick Start

### Basic Agent

```typescript
import { Agent, run } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.'
});

const result = await run(agent, 'Hello!');
console.log(result.finalOutput);
```

### Agent with Tools (Parallel Execution)

```typescript
import { Agent, run, tool } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const agent = new Agent({
  name: 'multi-tool-agent',
  model: openai('gpt-4o'),
  instructions: 'You have access to multiple tools.',
  tools: {
    getWeather: tool({
      description: 'Get weather for a city',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        // Tool 1 executes in parallel with tool 2
        return { city, temp: 22, condition: 'Sunny' };
      },
    }),
    getTime: tool({
      description: 'Get current time',
      inputSchema: z.object({
        timezone: z.string().optional(),
      }),
      execute: async ({ timezone }) => {
        // Tool 2 executes in parallel with tool 1
        return { time: new Date().toISOString(), timezone };
      },
    }),
  },
});

// Both tools execute in parallel automatically!
const result = await run(agent, 'What is the weather in Tokyo and what time is it?');
```

### Multi-Agent System with Handoffs

```typescript
import { Agent, run } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

// Specialized agents
const researchAgent = new Agent({
  name: 'Researcher',
  model: openai('gpt-4o'),
  instructions: 'You research topics and gather information.',
  handoffDescription: 'Use for research tasks',
  tools: { /* research tools */ }
});

const writerAgent = new Agent({
  name: 'Writer',
  model: openai('gpt-4o'),
  instructions: 'You write content based on research.',
  handoffDescription: 'Use for writing tasks'
});

// Coordinator with autonomous handoffs
const coordinator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o'),
  instructions: 'Coordinate between researchers and writers.',
  handoffs: [researchAgent, writerAgent]
});

// Agent autonomously decides to handoff to researcher, then writer
const result = await run(coordinator, 'Write an article about AI agents');
```

### Dynamic Approvals (HITL)

```typescript
import { Agent, run, tool, toolWithApproval, ApprovalPolicies } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const deleteFileTool = tool({
  description: 'Delete a file',
  inputSchema: z.object({ path: z.string() }),
  execute: async ({ path }) => `Deleted ${path}`,
});

// Wrap tool with dynamic approval policy
const safeDeleteTool = toolWithApproval(deleteFileTool, {
  needsApproval: async (context, args, callId) => {
    // Dynamic approval based on context
    return !context.context.isAdmin && args.path.includes('important');
  },
  approvalMetadata: {
    severity: 'high',
    category: 'file_operations',
  },
});

const agent = new Agent({
  name: 'FileManager',
  model: openai('gpt-4o'),
  instructions: 'You manage files.',
  tools: { deleteFile: safeDeleteTool },
});

// Will require approval for non-admins deleting important files
const result = await run(agent, 'Delete important.txt', {
  context: { isAdmin: false },
});
```

### Native MCP Integration

```typescript
import { Agent, run } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'MCPAgent',
  model: openai('gpt-4o'),
  instructions: 'You have access to filesystem tools via MCP.',
  // Native MCP integration - tools auto-discovered!
  mcpServers: [
    {
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    },
  ],
});

// MCP tools are automatically available!
const result = await run(agent, 'List files in the directory');
```

### Complete Observability

```typescript
import { Agent, run, initializeLangfuse } from 'tawk-agents-sdk';

// Enable Langfuse tracing
initializeLangfuse();

// All agent runs, tool calls, handoffs, and approvals are automatically traced!
const result = await run(agent, 'Complex task');

// View in Langfuse dashboard:
// - Agent execution timeline
// - Tool calls with inputs/outputs/durations
// - Handoff chains
// - Approval requests
// - Token usage and costs
// - Error tracking
```

## 📚 Core Concepts

### 🤖 True Agentic Architecture

Unlike sequential chains, this SDK implements true agentic behavior:

- **Agent-Driven Decision Making**: Agents autonomously decide next steps
- **Parallel Tool Execution**: Multiple tools execute simultaneously
- **Dynamic State Transitions**: Proper state management with interruption/resumption
- **Autonomous Handoffs**: Agents decide when to delegate to specialists

### 🔧 Tool Execution

Tools automatically execute in parallel when possible:

```typescript
// Agent calls both tools simultaneously
const result = await run(agent, 'Get weather in Tokyo and New York');

// Tool execution happens in parallel:
// - getWeather('Tokyo')    // Starts immediately
// - getWeather('New York') // Starts immediately
// Both complete, then agent processes results
```

### 👥 Multi-Agent Coordination

Agents autonomously handoff to specialists:

```typescript
// Agent autonomously decides handoff chain:
// Coordinator → Researcher → Writer → Reviewer
const result = await run(coordinator, 'Research and write about quantum computing');

// Handoff chain tracked automatically in metadata
console.log(result.metadata.handoffChain);
// ['Coordinator', 'Researcher', 'Writer', 'Reviewer']
```

### ✅ Human-in-the-Loop (HITL)

Dynamic approval policies based on context:

```typescript
const tool = toolWithApproval(baseTool, {
  needsApproval: async (context, args, callId) => {
    // Complex approval logic
    if (context.isAdmin) return false;
    if (args.amount > 1000) return true;
    if (context.userRole === 'guest') return true;
    return false;
  },
  approvalMetadata: {
    severity: 'medium',
    category: 'payment',
    requiredRole: 'manager',
  },
});
```

## 🛠️ Advanced Features

### Session Management

Persistent conversation history with multiple backends:

```typescript
import { MemorySession, RedisSession, DatabaseSession, HybridSession } from 'tawk-agents-sdk';

// Memory (development)
const session = new MemorySession('user-123', 50);

// Redis (production)
const session = new RedisSession('user-123', { redis, maxMessages: 50, ttl: 3600 });

// MongoDB (production)
const session = new DatabaseSession('user-123', { db, maxMessages: 100 });

// Hybrid (Redis + MongoDB)
const session = new HybridSession('user-123', { redis, db, redisTTL: 3600 });

await run(agent, 'Hello', { session });
```

### Guardrails

Built-in safety and validation:

```typescript
import {
  contentSafetyGuardrail,
  piiDetectionGuardrail,
  lengthGuardrail,
  toxicityGuardrail,
} from 'tawk-agents-sdk';

const agent = new Agent({
  name: 'safe-agent',
  model: openai('gpt-4o'),
  instructions: 'You are a safe assistant.',
  guardrails: [
    contentSafetyGuardrail({ type: 'input', model: openai('gpt-4o-mini') }),
    piiDetectionGuardrail({ type: 'input', block: true }),
    toxicityGuardrail({ type: 'output', model: openai('gpt-4o-mini'), threshold: 5 }),
    lengthGuardrail({ type: 'output', maxLength: 1000 }),
  ],
});
```

### Streaming

Real-time response streaming:

```typescript
import { Agent, runStream } from 'tawk-agents-sdk';

const streamResult = await runStream(agent, 'Tell me a story');

// Stream text chunks
for await (const chunk of streamResult.textStream) {
  process.stdout.write(chunk);
}

// Or listen to all events
for await (const event of streamResult.fullStream) {
  switch (event.type) {
    case 'text-delta':
      process.stdout.write(event.textDelta);
      break;
    case 'tool-call':
      console.log('Tool:', event.toolName);
      break;
    case 'handoff':
      console.log('Handoff:', event.from, '→', event.to);
      break;
  }
}
```

### TOON Format

Efficient token encoding (42% reduction):

```typescript
import { encodeTOON, decodeTOON } from 'tawk-agents-sdk';

// Use in tools for efficient data transfer
const agent = new Agent({
  tools: {
    getUsers: tool({
      description: 'Get users',
      inputSchema: z.object({}),
      execute: async () => {
        const users = await db.users.find().toArray();
        // Return TOON instead of JSON (42% smaller)
        return encodeTOON(users);
      },
    }),
  },
});
```

### Race Agents

Run multiple agents in parallel, use fastest response:

```typescript
import { raceAgents } from 'tawk-agents-sdk';

const fastAgent = new Agent({ name: 'fast', model: openai('gpt-4o-mini') });
const smartAgent = new Agent({ name: 'smart', model: openai('gpt-4o') });
const cheapAgent = new Agent({ name: 'cheap', model: groq('llama-3-70b') });

const result = await raceAgents(
  [fastAgent, smartAgent, cheapAgent],
  'What is the capital of France?',
  { timeoutMs: 5000 }
);

console.log(`Winner: ${result.winningAgent.name}`);
```

## 📖 Documentation

- **[Getting Started Guide](./docs/getting-started/GETTING_STARTED.md)** - Comprehensive tutorial
- **[Core Concepts](./docs/guides/CORE_CONCEPTS.md)** - Understand the architecture
- **[API Reference](./docs/reference/API.md)** - Complete API documentation
- **[Features Guide](./docs/guides/FEATURES.md)** - All features explained
- **[Advanced Features](./docs/guides/ADVANCED_FEATURES.md)** - Message helpers, hooks, tracing, and more
- **[Agentic RAG](./docs/guides/AGENTIC_RAG.md)** - Build RAG systems
- **[Performance](./docs/reference/PERFORMANCE.md)** - Optimization guide
- **[Architecture](./docs/reference/ARCHITECTURE.md)** - Technical deep dive
- **[Examples](./examples)** - Working code examples

## 🧪 Testing

```bash
# Build
npm run build

# Unit tests
npm test

# E2E tests
npm run e2e

# Specific test suites
npm run test:core      # Core functionality
npm run test:tools     # Tool execution
npm run test:multi     # Multi-agent
npm run test:guards    # Guardrails
npm run test:sessions  # Session management
npm run test:tracing   # Langfuse tracing
```

## 🌍 Environment Variables

```bash
# AI Provider (choose one or more)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...

# Langfuse Tracing (optional)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Redis (optional)
REDIS_URL=redis://localhost:6379

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/myapp
```

## 📦 Package Information

- **Name**: `tawk-agents-sdk`
- **Version**: `1.0.0`
- **License**: MIT
- **Node**: >=18.0.0
- **TypeScript**: 5.7+

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and migration guides.

## 📄 License

MIT © [Tawk.to](https://www.tawk.to)

## 🙏 Acknowledgments

Built with:

- [Vercel AI SDK v5](https://sdk.vercel.ai) - Multi-provider AI framework
- [Langfuse](https://langfuse.com) - LLM observability
- [TOON Format](https://github.com/toon-format/toon) - Token optimization
- [Zod](https://zod.dev) - Schema validation
- [MCP](https://modelcontextprotocol.io) - Model Context Protocol

## 💬 Support

- 📧 Email: support@tawk.to
- 🐛 Issues: [GitHub Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)
- 📖 Docs: [Full Documentation](./docs)
- 💬 Community: [Discord](https://discord.gg/tawk) (coming soon)

## 🌟 Star Us!

If you find this SDK helpful, please consider giving us a star on [GitHub](https://github.com/Manoj-tawk/tawk-agents-sdk)!

---

**Made with ❤️ by [Tawk.to](https://www.tawk.to)**
