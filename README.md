<div align="center">

<img src="https://cdn.tawk.to/logo.png" alt="Tawk.to" width="200" style="margin-bottom: 20px"/>

# Tawk Agents SDK

**A production-ready AI agent framework with multi-agent coordination, automatic tracing, and comprehensive safety controls**

[![npm version](https://badge.fury.io/js/%40tawk-agents-sdk%2Fcore.svg)](https://www.npmjs.com/package/@tawk-agents-sdk/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Examples](#-examples) • [API Reference](#-api-reference)

</div>

---

## Overview

Tawk Agents SDK is a **flexible, production-ready framework** for building AI agent systems with advanced capabilities including multi-agent workflows, automatic observability, guardrails, and session management.

**Inspired by modern agent architectures** and built on top of the **Vercel AI SDK**, we designed this framework to **avoid vendor lock-in** while providing the flexibility to work with any LLM provider (OpenAI, Anthropic, Google, Mistral, and more).

### Why Tawk Agents SDK?

- 🎯 **No Vendor Lock-In** - Built on Vercel AI SDK, switch providers freely
- 🤖 **Multi-Agent Orchestration** - Coordinate multiple specialized AI agents
- 📊 **Automatic Tracing** - Built-in Langfuse integration for complete observability
- 🛡️ **Production-Ready** - Comprehensive guardrails, error handling, and safety controls
- 💪 **Type-Safe** - Full TypeScript support with strict mode
- ⚡ **Battle-Tested** - Extensive test coverage with real API calls

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **🤖 Multi-Agent System** | Orchestrate multiple specialized agents with automatic handoffs |
| **🔧 Function Calling** | Define tools with automatic schema generation from Zod schemas |
| **💬 Session Management** | Built-in conversation memory with multiple storage backends |
| **🎯 Context Management** | Dependency injection pattern for request-scoped data |
| **⚡ Streaming** | Real-time response streaming for better UX |
| **📊 Structured Output** | Parse responses into typed objects with validation |
| **🛡️ Guardrails** | 10+ built-in validators for content safety and quality |
| **📈 Automatic Tracing** | Complete observability with Langfuse integration |

### Advanced Features

| Feature | Description |
|---------|-------------|
| **🔌 MCP Support** | Model Context Protocol for external tool integration |
| **👤 Human-in-the-Loop** | Approval workflows for sensitive operations |
| **🎭 Dynamic Instructions** | Instructions as functions with access to context |
| **🔗 Agent as Tool** | Use agents as tools within other agents |
| **⏱️ Background Results** | Handle long-running async operations |
| **🚨 Custom Errors** | Detailed error types for different failure scenarios |
| **📦 Multi-Storage** | Redis, MongoDB, In-Memory, and Hybrid session storage |

### Multi-Provider Support

Works seamlessly with any Vercel AI SDK provider:

- ✅ **OpenAI** (GPT-4, GPT-4o, GPT-3.5-turbo)
- ✅ **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
- ✅ **Google** (Gemini 2.0 Pro, Gemini 1.5 Pro)
- ✅ **Mistral** (Mistral Large, Mistral Medium)
- ✅ **And many more** via Vercel AI SDK

---

## 🚀 Quick Start

### Installation

```bash
npm install @tawk-agents-sdk/core ai @ai-sdk/openai zod
```

### Basic Example

```typescript
import { Agent, run } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

// Create an agent
const agent = new Agent({
  name: 'Assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful AI assistant.',
});

// Run the agent
const result = await run(agent, 'What is the capital of France?');
console.log(result.finalOutput); // "The capital of France is Paris."
```

### Agent with Tools

```typescript
import { Agent, run, tool } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Define a tool
const getWeather = tool({
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ location, unit }) => {
    // Call your weather API
    return {
      location,
      temperature: 22,
      unit,
      condition: 'Sunny',
    };
  },
});

// Create agent with tools
const weatherAgent = new Agent({
  name: 'Weather Assistant',
  model: openai('gpt-4o'),
  instructions: 'You help users check the weather.',
  tools: { getWeather },
});

const result = await run(weatherAgent, "What's the weather in Tokyo?");
console.log(result.finalOutput);
```

### Multi-Agent Workflow

```typescript
import { Agent, run, withTrace } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// Define specialized agents
const researcher = new Agent({
  name: 'Researcher',
  model: google('gemini-2.0-flash-exp'),
  instructions: 'You are an expert researcher who finds accurate information.',
});

const writer = new Agent({
  name: 'Writer',
  model: openai('gpt-4o'),
  instructions: 'You are a skilled writer who creates engaging content.',
});

const editor = new Agent({
  name: 'Editor',
  model: openai('gpt-4o'),
  instructions: 'You are a meticulous editor who refines content.',
});

// Run multi-agent workflow with single trace
await withTrace('Content Creation Workflow', async (trace) => {
  // Step 1: Research
  const research = await run(researcher, 'Research the latest AI trends');
  
  // Step 2: Write
  const draft = await run(writer, `Write an article: ${research.finalOutput}`);
  
  // Step 3: Edit
  const final = await run(editor, `Edit this article: ${draft.finalOutput}`);
  
  console.log(final.finalOutput);
});

// View complete workflow trace in Langfuse with all agents, tools, and tokens
```

### With Automatic Handoffs

```typescript
import { Agent, run, Handoff } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

// Create specialized agents
const supportAgent = new Agent({
  name: 'Support',
  model: openai('gpt-4o'),
  instructions: 'You handle general customer support inquiries.',
});

const billingAgent = new Agent({
  name: 'Billing',
  model: openai('gpt-4o'),
  instructions: 'You handle billing and payment issues.',
});

// Define handoff from support to billing
const handoffToBilling = new Handoff({
  agentName: 'Billing',
  agent: billingAgent,
  toolName: 'transfer_to_billing',
  toolDescription: 'Transfer to billing specialist for payment issues',
});

// Coordinator agent with handoffs
const coordinator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o'),
  instructions: 'You coordinate customer inquiries and delegate to specialists.',
  handoffs: [supportAgent, billingAgent],
});

// Automatic delegation based on query
const result = await run(coordinator, 'I need help with my invoice');
// Automatically hands off to Billing agent
```

### With Langfuse Tracing

```typescript
import { Agent, run, initializeLangfuse } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

// Initialize tracing (reads from environment variables)
initializeLangfuse();

const agent = new Agent({
  name: 'Assistant',
  model: openai('gpt-4o'),
  instructions: 'You are helpful.',
});

// All runs are automatically traced!
const result = await run(agent, 'Hello!');

// View traces at: https://cloud.langfuse.com
// See: tokens used, latency, costs, tool calls, handoffs, and more
```

---

## 📚 Documentation

### Getting Started
- [Installation & Setup](./docs/GETTING_STARTED.md) - Get up and running quickly
- [Core Concepts](./docs/CORE_CONCEPTS.md) - Understand the fundamentals
- [Project Structure](./docs/PROJECT_STRUCTURE.md) - Codebase organization

### Core Features
- [Agents](./docs/API.md#agent-class) - Create and configure agents
- [Tools](./docs/API.md#tools) - Define function calling tools
- [Multi-Agent Workflows](./docs/API.md#multi-agent-workflows) - Coordinate multiple agents
- [Sessions & Memory](./docs/API.md#session-management) - Manage conversation history
- [Streaming](./docs/API.md#streaming) - Real-time response streaming

### Advanced Features
- [Guardrails](./docs/API.md#guardrails) - Safety and quality controls
- [Langfuse Integration](./docs/LANGFUSE.md) - Observability and tracing
- [MCP Support](./docs/API.md#mcp-model-context-protocol) - External tool integration
- [Human-in-the-Loop](./docs/API.md#human-in-the-loop) - Approval workflows
- [Structured Output](./docs/API.md#structured-output) - Type-safe parsing
- [Error Handling](./docs/API.md#error-handling) - Custom error types

### Reference
- [API Reference](./docs/API.md) - Complete API documentation
- [Testing Guide](./docs/TESTING.md) - How to test your agents
- [Migration Guide](./MIGRATION.md) - Migrate from other frameworks

---

## 🎓 Examples

### Example Projects

See [examples/complete-examples.ts](./examples/complete-examples.ts) for:

- ✅ Basic agent operations
- ✅ Agents with tools
- ✅ Multi-agent coordination with handoffs
- ✅ Session management (Memory, Redis, MongoDB)
- ✅ Guardrails and content safety
- ✅ Streaming responses
- ✅ Structured output parsing
- ✅ Human-in-the-loop approvals
- ✅ Error handling patterns
- ✅ Context management

### Run Examples

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your API keys to .env

# Run examples
npm run example
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Set up environment variables
cp .env.example .env
# Add your API keys: OPENAI_API_KEY, GOOGLE_API_KEY, LANGFUSE_*

# Run all tests (9 test suites)
npm test

# View test traces in Langfuse
# https://cloud.langfuse.com
```

### Test Coverage

All tests include real API calls:

- ✅ Basic agent operations
- ✅ Multi-provider support (OpenAI + Google)
- ✅ Tools and function calling
- ✅ Multi-agent handoffs
- ✅ Sessions and context management
- ✅ Guardrails validation
- ✅ Streaming responses
- ✅ Structured output
- ✅ Error handling
- ✅ Complete integration scenarios

---

## 📖 API Reference

### Core Functions

#### `Agent` Class

Create an AI agent with instructions, tools, and handoffs.

```typescript
const agent = new Agent<TContext, TOutput>({
  name: string;                          // Agent name
  model: LanguageModel;                  // AI model (from Vercel AI SDK)
  instructions: string | Function;       // Instructions (static or dynamic)
  tools?: Record<string, Tool>;          // Available tools
  handoffs?: Agent[];                    // Agents to hand off to
  guardrails?: Guardrail[];              // Safety validators
  outputSchema?: ZodSchema;              // Output validation schema
  maxSteps?: number;                     // Max steps per run
  modelSettings?: {                      // Model parameters
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
});
```

#### `run()` - Execute Agent

Run an agent and get the final result.

```typescript
const result = await run(agent, input, {
  session?: Session;        // For conversation history
  context?: TContext;       // Shared context data
  maxTurns?: number;        // Max turns (default: 50)
});

// Result properties
result.finalOutput;         // Final agent output
result.messages;            // All messages
result.history;             // Complete conversation history
result.steps;               // Execution steps
result.usage;               // Token usage stats
```

#### `runStream()` - Stream Agent Execution

Stream agent responses in real-time.

```typescript
const stream = await runStream(agent, input, options);

// Stream text chunks
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// Get final result
const result = await stream.completed;
```

#### `tool()` - Define Tools

Create tools with automatic schema generation.

```typescript
const myTool = tool({
  description: string;                   // Tool description for AI
  parameters: ZodSchema;                 // Input schema (Zod)
  execute: async (params) => result;     // Tool implementation
});
```

#### `withTrace()` - Trace Workflows

Wrap multi-agent workflows in a single trace.

```typescript
await withTrace('Workflow Name', async (trace) => {
  // All agent runs here appear in single trace
  const result1 = await run(agent1, input);
  const result2 = await run(agent2, input);
  return result2;
});
```

### Session Management

Manage conversation history across multiple backends.

```typescript
import { SessionManager } from '@tawk-agents-sdk/core';

// In-Memory (default)
const sessionManager = new SessionManager({ type: 'memory' });

// Redis
const sessionManager = new SessionManager({
  type: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'optional',
  },
});

// MongoDB
const sessionManager = new SessionManager({
  type: 'mongodb',
  mongodb: {
    url: 'mongodb://localhost:27017',
    database: 'agents',
    collection: 'sessions',
  },
});

// Use session
const session = sessionManager.getSession('user-123');
const result = await run(agent, 'Hello!', { session });
```

### Guardrails

Add safety and quality controls to your agents.

```typescript
import { guardrails } from '@tawk-agents-sdk/core';

const agent = new Agent({
  name: 'Safe Agent',
  guardrails: [
    // Content safety (Azure/OpenAI moderation)
    guardrails.contentSafety({
      type: 'output',
      provider: 'openai',
      categories: ['hate', 'violence', 'sexual'],
      threshold: 0.8,
    }),
    
    // PII detection
    guardrails.piiDetection({
      type: 'output',
      action: 'block',  // or 'redact', 'flag'
    }),
    
    // Length validation
    guardrails.length({
      type: 'output',
      maxLength: 500,
      unit: 'words',
    }),
    
    // Custom guardrail
    {
      name: 'custom-check',
      type: 'output',
      validate: async (content, context) => {
        if (content.includes('forbidden')) {
          return {
            passed: false,
            reason: 'Contains forbidden content',
          };
        }
        return { passed: true };
      },
    },
  ],
});
```

### Handoffs

Define structured handoffs between agents.

```typescript
import { Handoff, removeAllTools, keepLastMessages } from '@tawk-agents-sdk/core';

const handoff = new Handoff({
  agentName: 'SpecialistAgent',
  agent: specialistAgent,
  toolName: 'transfer_to_specialist',
  toolDescription: 'Transfer to specialist for complex issues',
  
  // Optional: Filter messages before handoff
  inputFilter: (data) => {
    return removeAllTools(keepLastMessages(5)(data));
  },
  
  // Optional: Conditional handoff
  isEnabled: (context) => context.userTier === 'premium',
  
  // Optional: Pre-handoff callback
  onInvokeHandoff: async (data) => {
    console.log(`Handing off to ${data.agent.name}`);
  },
});

// Use in coordinator
const coordinator = new Agent({
  name: 'Coordinator',
  handoffs: [specialistAgent],
  instructions: 'Coordinate and delegate to specialists.',
});
```

### Structured Output

Parse agent responses into typed objects.

```typescript
import { Agent, run } from '@tawk-agents-sdk/core';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const agent = new Agent({
  name: 'Data Extractor',
  outputSchema: schema,  // or outputType: schema (alias)
  instructions: 'Extract user data and return as JSON.',
});

const result = await run(agent, 'John is 30 years old, email: john@example.com');
// result.finalOutput is typed as { name: string; age: number; email: string; }
```

### Error Handling

Handle different error scenarios.

```typescript
import {
  MaxTurnsExceededError,
  GuardrailTripwireTriggered,
  ToolExecutionError,
  HandoffError,
  ApprovalRequiredError,
} from '@tawk-agents-sdk/core';

try {
  const result = await run(agent, input);
} catch (error) {
  if (error instanceof MaxTurnsExceededError) {
    console.log('Agent exceeded max turns');
  } else if (error instanceof GuardrailTripwireTriggered) {
    console.log('Content violated guardrail:', error.guardrailName);
  } else if (error instanceof ToolExecutionError) {
    console.log('Tool failed:', error.toolName);
  } else if (error instanceof HandoffError) {
    console.log('Handoff failed:', error.targetAgent);
  } else if (error instanceof ApprovalRequiredError) {
    console.log('Approval needed:', error.toolName);
  }
}
```

### Langfuse Integration

Enable automatic tracing and observability.

```typescript
import { initializeLangfuse } from '@tawk-agents-sdk/core';

// Initialize once (reads from environment)
// LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST
initializeLangfuse();

// All agent runs are now automatically traced!

// View traces at: https://cloud.langfuse.com
// See: Tokens, costs, latency, tools, handoffs, errors
```

---

## 🌐 Multi-Provider Examples

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  model: openai('gpt-4o'),
  // or: openai('gpt-4'), openai('gpt-3.5-turbo')
});
```

### Anthropic

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const agent = new Agent({
  model: anthropic('claude-3-5-sonnet-20241022'),
  // or: anthropic('claude-3-opus-20240229')
});
```

### Google

```typescript
import { google } from '@ai-sdk/google';

const agent = new Agent({
  model: google('gemini-2.0-flash-exp'),
  // or: google('gemini-1.5-pro')
});
```

### Mistral

```typescript
import { mistral } from '@ai-sdk/mistral';

const agent = new Agent({
  model: mistral('mistral-large-latest'),
});
```

---

## 🛠️ Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Code of Conduct
- Development setup
- Pull request process
- Coding standards

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

This framework is built on top of:
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - Multi-provider AI framework
- **[Langfuse](https://langfuse.com/)** - LLM observability platform

Inspired by modern agent architectures including the [OpenAI Agents SDK](https://github.com/openai/openai-agents-js), we built this framework to provide similar capabilities while avoiding vendor lock-in and offering maximum flexibility through the Vercel AI SDK.

---

## 📮 Support

- 📧 **Email**: support@tawk.to
- 💬 **Issues**: [GitHub Issues](https://github.com/tawk/agents-sdk/issues)
- 📚 **Documentation**: [Full Documentation](./docs/)
- 🌐 **Website**: [tawk.to](https://www.tawk.to)

---

<div align="center">

**Made with ❤️ by [Tawk.to](https://www.tawk.to)**

[⭐ Star us on GitHub](https://github.com/tawk/agents-sdk) • [📦 View on NPM](https://www.npmjs.com/package/@tawk-agents-sdk/core)

</div>
