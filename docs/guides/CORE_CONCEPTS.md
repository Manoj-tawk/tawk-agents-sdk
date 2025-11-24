# Core Concepts

Understanding the fundamental concepts of Tawk Agents SDK.

## Agents

An **Agent** is an AI entity with specific instructions, tools, and capabilities.

```typescript
const agent = new Agent({
  name: 'support-agent',
  model: openai('gpt-4o'),
  instructions: 'You help users with support questions.',
  tools: { /* tools */ },
  guardrails: [ /* guardrails */ ]
});
```

### Key Properties

- **name**: Identifier for logging and tracing
- **model**: AI model from any Vercel AI SDK provider
- **instructions**: System prompt defining behavior
- **tools**: Functions the agent can call
- **guardrails**: Validation rules for safety

## Tools

**Tools** are functions that agents can call to perform actions. Tools can access execution context automatically.

```typescript
import { tool } from '@tawk-agents-sdk/core';
import { z } from 'zod';

const myTool = tool({
  name: 'my_tool', // Optional tool name
  description: 'What this tool does',
  parameters: z.object({
    param: z.string().describe('Parameter description')
  }),
  execute: async ({ param }, context) => {
    // Tool implementation
    // Context is automatically injected (RunContextWrapper)
    // Access context.context for your custom context
    return { result: 'value' };
  },
  enabled: true // Optional: can be boolean or function
});
```

### Tool Execution Flow

1. Agent decides to use a tool
2. SDK validates parameters
3. Tool's `execute` function is called
4. Result is returned to the agent
5. Agent continues with the result

## Sessions

**Sessions** maintain conversation history across multiple turns.

```typescript
import { MemorySession } from '@tawk-agents-sdk/core';

const session = new MemorySession('user-123', 50); // id, maxMessages

// First message
await run(agent, 'My name is Alice', { session });

// Second message - remembers context
await run(agent, 'What is my name?', { session });
```

### Session Types

- **MemorySession**: In-memory (development/testing)
- **RedisSession**: Redis-backed (production)
- **DatabaseSession**: MongoDB-backed (production)
- **HybridSession**: Redis + MongoDB (production)

## Context Injection

**Context** provides request-scoped data to tools automatically.

```typescript
interface UserContext {
  userId: string;
  db: Database;
}

const agent = new Agent<UserContext>({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You help users.',
  tools: {
    getUserData: {
      description: 'Get user data',
      parameters: z.object({}),
      execute: async ({}, context) => {
        // Context is automatically injected
        return await context.db.users.findOne({ 
          id: context.userId 
        });
      }
    }
  }
});

await run(agent, 'Show my profile', {
  context: { userId: '123', db: database }
});
```

## Guardrails

**Guardrails** validate inputs and outputs for safety and quality.

```typescript
import { 
  contentSafetyGuardrail,
  piiDetectionGuardrail,
  lengthGuardrail 
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
    lengthGuardrail({ 
      type: 'output',
      maxLength: 1000 
    })
  ]
});

const result = await run(agent, userInput);
```

### Guardrail Types

- **Input Guardrails**: Validate before agent processes
- **Output Guardrails**: Validate after agent responds

## Multi-Agent Handoffs

Agents can delegate to specialized agents:

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
  handoffDescription: 'Handle technical issues'
});

const triageAgent = new Agent({
  name: 'triage',
  model: openai('gpt-4o'),
  instructions: 'You route users to the right agent.',
  handoffs: [salesAgent, supportAgent]
});

// Agent automatically hands off based on query
await run(triageAgent, 'I need help with pricing');
// -> Hands off to salesAgent
```

## Streaming

**Streaming** provides real-time responses as they're generated.

```typescript
const stream = await runStream(agent, 'Tell me a story');

// Stream text chunks
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// Get final result
const result = await stream.completed;
```

## Error Handling

Custom error types for different scenarios:

```typescript
import {
  MaxTurnsExceededError,
  GuardrailTripwireTriggered,
  ToolExecutionError
} from '@tawk-agents-sdk/core';

try {
  await run(agent, 'Your message');
} catch (error) {
  if (error instanceof MaxTurnsExceededError) {
    // Handle max turns exceeded
  } else if (error instanceof GuardrailTripwireTriggered) {
    // Handle guardrail failure
  }
}
```

## Best Practices

### 1. Clear Instructions

```typescript
// ❌ Bad
instructions: 'Help users'

// ✅ Good
instructions: 'You are a customer support agent. Be friendly, concise, and professional. Always verify user identity before accessing account information.'
```

### 2. Descriptive Tool Schemas

```typescript
// ❌ Bad
parameters: z.object({ q: z.string() })

// ✅ Good
parameters: z.object({
  query: z.string().describe('The search query to execute')
})
```

### 3. Use Sessions for Multi-Turn

```typescript
// ❌ Bad - No memory
await run(agent, 'My name is Alice');
await run(agent, 'What is my name?'); // Won't remember

// ✅ Good - With session
const session = new MemorySession('user-123', 50);
await run(agent, 'My name is Alice', { session });
await run(agent, 'What is my name?', { session }); // Remembers!
```

## Next Steps

- [API Reference](../reference/API.md) - Complete API documentation
- [Features Guide](./FEATURES.md) - Explore all features
- [Architecture](../reference/ARCHITECTURE.md) - System design details
