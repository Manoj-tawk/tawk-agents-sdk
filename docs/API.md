# API Reference

Complete API reference for Tawk Agents SDK.

## Table of Contents

- [Core Functions](#core-functions)
- [Agent Class](#agent-class)
- [Tool Definition](#tool-definition)
- [Session Management](#session-management)
- [Guardrails](#guardrails)
- [Langfuse Integration](#langfuse-integration)
- [Types](#types)
- [Error Classes](#error-classes)

## Core Functions

### `run(agent, input, options?)`

Execute an agent with input and return the final result.

**Parameters:**
- `agent: Agent` - The agent to run
- `input: string | CoreMessage[]` - User input
- `options?: RunOptions` - Optional configuration

**Returns:** `Promise<RunResult>`

**Example:**
```typescript
const result = await run(agent, 'Hello!', {
  session,
  context,
  maxTurns: 10,
});
```

**RunOptions:**
```typescript
interface RunOptions<TContext = any> {
  session?: Session;        // Session for history
  context?: TContext;       // Request-scoped data
  maxTurns?: number;        // Max turns (default: 100)
  onStepFinish?: (step: StepResult) => void;  // Step callback
}
```

**RunResult:**
```typescript
interface RunResult<TOutput = string> {
  finalOutput: TOutput;     // Final agent output
  steps: StepResult[];      // All execution steps
  metadata: RunMetadata;    // Token usage, etc.
}
```

### `runStream(agent, input, options?)`

Stream agent responses in real-time.

**Parameters:**
- `agent: Agent` - The agent to run
- `input: string | CoreMessage[]` - User input
- `options?: RunOptions` - Optional configuration

**Returns:** `Promise<StreamResult>`

**Example:**
```typescript
const stream = await runStream(agent, 'Tell me a story');

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const result = await stream.completed;
```

**StreamResult:**
```typescript
interface StreamResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<StreamChunk>;
  completed: Promise<RunResult>;
}
```

### `tool(config)`

Define a tool that agents can use.

**Parameters:**
- `config: ToolConfig` - Tool configuration

**Returns:** `CoreTool`

**Example:**
```typescript
const myTool = tool({
  description: 'Tool description',
  parameters: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }, contextWrapper) => {
    // Access context via contextWrapper.context
    const context = contextWrapper?.context;
    return { result: 'value' };
  },
});
```

**ToolConfig:**
```typescript
interface ToolConfig<TParams, TContext, TResult> {
  description: string;
  parameters: z.ZodObject<TParams>;
  execute: (params: TParams, contextWrapper?: RunContextWrapper<TContext>) => Promise<TResult>;
}
```

### `setDefaultModel(model)`

Set a default model for all agents.

**Parameters:**
- `model: LanguageModel` - Model from AI SDK provider

**Example:**
```typescript
import { openai } from '@ai-sdk/openai';

setDefaultModel(openai('gpt-4o-mini'));
```

## Agent Class

### Constructor

```typescript
class Agent<TContext = any, TOutput = string> {
  constructor(config: AgentConfig<TContext, TOutput>);
}
```

**AgentConfig:**
```typescript
interface AgentConfig<TContext = any, TOutput = string> {
  name: string;                           // Agent name
  model?: LanguageModel;                  // AI model (optional if default set)
  instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
  tools?: Record<string, CoreTool>;       // Available tools
  handoffs?: Agent[];                     // Agents to delegate to
  guardrails?: Guardrail[];               // Input/output validation
  outputSchema?: z.ZodSchema<TOutput>;    // Structured output schema
  modelSettings?: ModelSettings;          // Model parameters
}
```

**ModelSettings:**
```typescript
interface ModelSettings {
  temperature?: number;      // 0.0 - 2.0
  topP?: number;            // 0.0 - 1.0
  maxTokens?: number;       // Max output tokens
  presencePenalty?: number; // -2.0 - 2.0
  frequencyPenalty?: number;// -2.0 - 2.0
}
```

### Properties

```typescript
agent.name: string;              // Agent name
agent.instructions: string;      // Agent instructions
```

### Methods

#### `clone(overrides?)`

Create a copy of the agent with optional overrides.

```typescript
const clone = agent.clone({
  name: 'New Name',
  instructions: 'Updated instructions',
});
```

#### `asTool(options?)`

Convert agent to a tool usable by other agents.

```typescript
const agentTool = agent.asTool({
  toolName: 'consult_expert',
  toolDescription: 'Consult the expert agent',
});

const mainAgent = new Agent({
  tools: { expert: agentTool },
});
```

## Session Management

### SessionManager

```typescript
class SessionManager {
  constructor(config: SessionManagerConfig);
  getSession(sessionId: string): Session;
}
```

**SessionManagerConfig:**
```typescript
type SessionManagerConfig =
  | { type: 'memory' }
  | { type: 'redis'; redis: RedisSessionConfig }
  | { type: 'mongodb'; mongodb: DatabaseSessionConfig }
  | { type: 'hybrid'; memory: {}; persistent: RedisSessionConfig | DatabaseSessionConfig };

interface RedisSessionConfig {
  host?: string;        // Default: localhost
  port?: number;        // Default: 6379
  password?: string;
  db?: number;
  keyPrefix?: string;   // Default: 'agent:session:'
}

interface DatabaseSessionConfig {
  url: string;          // MongoDB connection URL
  dbName?: string;      // Default: 'agents'
  collection?: string;  // Default: 'sessions'
}
```

### Session Interface

```typescript
interface Session {
  id: string;
  getHistory(): Promise<CoreMessage[]>;
  appendMessage(message: CoreMessage): Promise<void>;
  clear(): Promise<void>;
}
```

## Guardrails

### Built-in Guardrails

```typescript
import { guardrails } from '@tawk-agents-sdk/core';

// Content Safety
guardrails.contentSafety(config?: {
  provider?: 'openai' | 'custom';
  apiKey?: string;
  action?: 'block' | 'flag' | 'redact';
})

// PII Detection
guardrails.piiDetection(config?: {
  types?: ('email' | 'phone' | 'ssn' | 'creditCard')[];
  action?: 'block' | 'flag' | 'redact';
})

// Length Validation
guardrails.length(config: {
  type: 'input' | 'output';
  minLength?: number;
  maxLength?: number;
  unit?: 'characters' | 'words' | 'tokens';
})

// Topic Relevance
guardrails.topicRelevance(config: {
  allowedTopics: string[];
  threshold?: number;
})

// Format Validation
guardrails.formatValidation(config: {
  format: 'json' | 'email' | 'url' | 'custom';
  pattern?: RegExp;
})

// Rate Limiting
guardrails.rateLimit(config: {
  maxRequests: number;
  windowMs: number;
})

// Language Detection
guardrails.language(config: {
  allowedLanguages: string[];
})

// Sentiment Analysis
guardrails.sentiment(config: {
  allowedSentiments: ('positive' | 'neutral' | 'negative')[];
})

// Toxicity Detection
guardrails.toxicity(config: {
  threshold?: number;  // 0.0 - 1.0
  action?: 'block' | 'flag';
})

// Custom Guardrail
guardrails.custom(config: {
  name: string;
  type: 'input' | 'output';
  validate: (content: string, context?: any) => Promise<GuardrailResult>;
})
```

**GuardrailResult:**
```typescript
interface GuardrailResult {
  passed: boolean;
  message?: string;
  metadata?: Record<string, any>;
}
```

## Langfuse Integration

```typescript
// Initialize
initializeLangfuse(): Langfuse | null;

// Get instance
getLangfuse(): Langfuse | null;

// Check if enabled
isLangfuseEnabled(): boolean;

// Create trace
createTrace(options: {
  name: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}): Trace | null;

// Flush traces
flushLangfuse(): Promise<void>;

// Shutdown
shutdownLangfuse(): Promise<void>;
```

## Types

### Core Message

```typescript
type CoreMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  name?: string;
  toolCallId?: string;
};
```

### StepResult

```typescript
interface StepResult {
  stepNumber: number;
  toolCalls: Array<{
    toolName: string;
    args: any;
    result: any;
  }>;
  text?: string;
  finishReason?: string;
}
```

### RunMetadata

```typescript
interface RunMetadata {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
}
```

## Error Classes

### MaxTurnsExceededError

```typescript
class MaxTurnsExceededError extends Error {
  constructor(maxTurns: number, agentName: string);
}
```

### GuardrailTripwireTriggered

```typescript
class GuardrailTripwireTriggered extends Error {
  constructor(guardrailName: string, message: string);
  guardrailName: string;
}
```

### ToolExecutionError

```typescript
class ToolExecutionError extends Error {
  constructor(toolName: string, originalError: Error);
  toolName: string;
  originalError: Error;
}
```

### HandoffError

```typescript
class HandoffError extends Error {
  constructor(fromAgent: string, toAgent: string, reason: string);
  fromAgent: string;
  toAgent: string;
}
```

### ApprovalRequiredError

```typescript
class ApprovalRequiredError extends Error {
  constructor(toolName: string, args: any);
  toolName: string;
  args: any;
}
```

## Version

Current version: `1.0.0`

```typescript
import { VERSION } from '@tawk-agents-sdk/core';
console.log(VERSION); // "1.0.0"
```

