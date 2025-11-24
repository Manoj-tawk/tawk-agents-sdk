# Architecture

System design and architecture of Tawk Agents SDK.

## Overview

Tawk Agents SDK is built with a modular architecture that separates concerns while maintaining high cohesion between related components.

## System Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer              │
│  (Your AI Applications, Agents)         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Tawk Agents SDK (Core)            │
│                                        │
│  ┌──────────┐  ┌──────────┐           │
│  │  Agent  │  │  Runner  │           │
│  └──────────┘  └──────────┘           │
│                                        │
│  ┌──────────┐  ┌──────────┐           │
│  │ Session │  │Guardrails │           │
│  └──────────┘  └──────────┘           │
│                                        │
│  ┌──────────┐  ┌──────────┐           │
│  │ Tracing │  │   Tools   │           │
│  └──────────┘  └──────────┘           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         AI SDK v5 Layer                │
│  (Text Generation, Streaming)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Model Providers                 │
│  OpenAI • Anthropic • Google • Groq    │
└────────────────────────────────────────┘
```

## Core Components

### 1. Agent System

**Location:** `src/core/agent.ts`

**Responsibility:** Agent definition and configuration

**Key Features:**
- Agent configuration with instructions, tools, guardrails
- Dynamic instructions based on context
- Tool management and execution
- Handoff coordination

### 2. Runner

**Location:** `src/core/agent.ts` (run functions)

**Responsibility:** Agent execution engine

**Key Features:**
- Synchronous execution (`run`)
- Streaming execution (`runStream`)
- Parallel tool execution
- Guardrail integration
- Session management
- Context injection

### 3. Session Management

**Location:** `src/sessions/`

**Responsibility:** Conversation history management

**Storage Options:**
- **MemorySession**: In-memory (development)
- **RedisSession**: Redis-backed (production)
- **DatabaseSession**: MongoDB-backed (production)
- **HybridSession**: Redis + MongoDB (production)

### 4. Guardrails

**Location:** `src/guardrails/`

**Responsibility:** Input/output validation

**Types:**
- Content safety
- PII detection
- Length validation
- Language validation
- Custom guardrails

### 5. Tools

**Location:** `src/tools/`

**Responsibility:** AI capabilities and tool definitions

**Features:**
- Embeddings generation
- Image generation
- Audio transcription
- Text-to-speech
- Reranking

### 6. Tracing

**Location:** `src/tracing/`, `src/lifecycle/langfuse/`

**Responsibility:** Observability and monitoring

**Features:**
- Langfuse integration
- Console logging
- Custom trace callbacks
- Performance metrics

### 7. MCP Integration

**Location:** `src/mcp/`

**Responsibility:** Model Context Protocol support

**Features:**
- MCP server management
- Tool conversion
- Dynamic tool loading

## Data Flow

### Simple Agent Execution

```
User Input
    ↓
[Input Guardrails]
    ↓
[Runner: Prepare Context]
    ↓
[AI SDK: Generate Text]
    ↓
[Tool Execution] (if needed)
    ↓
[Output Guardrails]
    ↓
[Session: Save History]
    ↓
Result
```

### Multi-Agent Handoff

```
User Input → Agent A
              ↓
         [Decision: Handoff?]
              ↓
         Agent B (Handoff)
              ↓
         Final Result
```

### Streaming Execution

```
User Input
    ↓
[Stream Setup]
    ↓
[AI SDK: Stream Text]
    ↓
[Stream Events] → Client
    ↓
[Final Result]
```

## Performance Optimizations

### 1. Parallel Tool Execution

Tools are executed in parallel when possible:

```typescript
// Multiple tools called simultaneously
const results = await Promise.all(
  toolCalls.map(call => executeTool(call))
);
```

### 2. Embedding Caching

Embeddings are cached to avoid redundant API calls:

```typescript
// LRU cache for embeddings
const cache = new LRUCache({ max: 1000 });
```

### 3. Batch Processing

Batch operations for better performance:

```typescript
// Batch embedding generation
const embeddings = await generateEmbeddingsAI({
  model,
  values: texts // Batch processing
});
```

## Type Safety

The SDK uses strict TypeScript with:

- No implicit `any`
- Strict null checks
- Full generic inference
- Comprehensive type exports

**Example:**
```typescript
const agent = new Agent<MyContext, MyOutput>({
  name: 'TypedAgent',
  instructions: (ctx: RunContextWrapper<MyContext>) => 
    `Context: ${ctx.context.value}`,
  model,
});

const result: RunResult<MyOutput> = await run(agent, 'Hello');
```

## Extensibility

### Custom Tools

```typescript
const customTool = tool({
  description: 'Custom functionality',
  parameters: z.object({ /* ... */ }),
  execute: async (args, context) => {
    // Your logic
  },
});
```

### Custom Guardrails

```typescript
const customGuardrail = customGuardrail({
  name: 'my-guardrail',
  type: 'input',
  validate: async (content, context) => {
    // Your validation
    return { passed: true };
  },
});
```

### Custom Session Storage

```typescript
class CustomSession implements Session {
  async getMessages() { /* ... */ }
  async addMessage() { /* ... */ }
  async clear() { /* ... */ }
}
```

## Error Handling

### Error Hierarchy

```
Error
 ├─ MaxTurnsExceededError
 ├─ GuardrailTripwireTriggered
 ├─ ToolExecutionError
 ├─ HandoffError
 └─ ApprovalRequiredError
```

### Graceful Degradation

- Tool failures don't crash agents
- Guardrail failures are logged
- Session errors fall back to memory
- Tracing errors don't affect execution

## Best Practices

### 1. Agent Design
- Single responsibility per agent
- Clear, specific instructions
- Minimal, focused tool sets

### 2. Performance
- Use caching for embeddings
- Batch operations when possible
- Enable parallel tool execution

### 3. Observability
- Always use tracing in production
- Monitor token usage
- Track tool execution times

### 4. Security
- Validate all inputs
- Use guardrails for sensitive operations
- Implement approval workflows for critical actions

---

For more details, see:
- [API Reference](./API.md)
- [Performance Guide](./PERFORMANCE.md)
- [Getting Started](../getting-started/GETTING_STARTED.md)
- [Core Concepts](../guides/CORE_CONCEPTS.md)
