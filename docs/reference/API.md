# API Reference

Complete API reference for Tawk Agents SDK.

## Table of Contents

- [Core Functions](#core-functions)
- [Agent Class](#agent-class)
- [Tool Definition](#tool-definition)
- [Session Management](#session-management)
- [Guardrails](#guardrails)
- [AI Tools](#ai-tools)
- [Tracing](#tracing)
- [MCP Integration](#mcp-integration)
- [Approvals](#approvals)
- [Types](#types)
- [Errors](#errors)

## Core Functions

### `run(agent, input, options?)`

Execute an agent with a user message or messages. Returns the final result with complete execution metadata.

**Signature:**
```typescript
function run<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[] | RunState,
  options?: RunOptions<TContext>
): Promise<RunResult<TOutput>>
```

**Parameters:**
- `agent` - The agent to execute
- `input` - User input as string, messages array, or state to resume
- `options` - Optional execution options (context, session, maxTurns, etc.)

**Returns:** Promise resolving to `RunResult<TOutput>` with final output and metadata

**Example:**
```typescript
const result = await run(agent, 'Hello!', {
  session: new MemorySession('user-123', 50),
  context: { userId: '123', db: database },
  maxTurns: 10
});

console.log(result.finalOutput);
console.log(result.metadata.totalTokens);
console.log(result.metadata.handoffChain);
```

**RunOptions:**
```typescript
interface RunOptions<TContext = any> {
  context?: TContext;
  session?: Session<TContext>;
  stream?: boolean;
  sessionInputCallback?: (history: CoreMessage[], newInput: CoreMessage[]) => CoreMessage[];
  maxTurns?: number;
}
```

**RunResult:**
```typescript
interface RunResult<TOutput = string> {
  finalOutput: TOutput;
  messages: CoreMessage[];
  steps: StepResult[];
  state?: RunState;
  metadata: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
    totalToolCalls?: number;
    handoffChain?: string[];
    agentMetrics?: AgentMetric[];
    raceParticipants?: string[];
    raceWinners?: string[];
  };
}
```

### `runStream(agent, input, options?)`

Execute an agent with streaming responses. Provides real-time text chunks and event streams.

**Signature:**
```typescript
function runStream<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[],
  options?: RunOptions<TContext>
): Promise<StreamResult<TOutput>>
```

**Parameters:**
- `agent` - The agent to execute
- `input` - User input as string or messages array
- `options` - Optional execution options

**Returns:** Promise resolving to `StreamResult` with text stream, full event stream, and completion promise

**Example:**
```typescript
const stream = await runStream(agent, 'Tell me a story');

// Stream text chunks
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// Or listen to all events
for await (const event of stream.fullStream) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.textDelta);
  } else if (event.type === 'tool-call') {
    console.log('Tool called:', event.toolCall?.toolName);
  }
}

// Get final result
const result = await stream.completed;
console.log('Final output:', result.finalOutput);
```

**StreamResult:**
```typescript
interface StreamResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<RunItemStreamEvent>;
  completed: Promise<RunResult>;
}
```

### `raceAgents(agents, input, options?)`

Execute multiple agents in parallel and return the first successful result. All agents execute simultaneously. If the first agent fails, waits for others. If all fail, throws an error.

**Signature:**
```typescript
function raceAgents<TContext, TOutput>(
  agents: Agent<TContext, TOutput>[],
  input: string | CoreMessage[],
  options?: RunOptions<TContext> & { timeoutMs?: number }
): Promise<RunResult<TOutput> & { winningAgent: Agent<TContext, TOutput> }>
```

**Parameters:**
- `agents` - Array of agents to race (must have at least one)
- `input` - Input message or messages array
- `options` - Run options with optional timeout in milliseconds

**Returns:** Promise resolving to result from the winning agent with `winningAgent` property

**Throws:** Error if no agents provided or all agents fail

**Example:**
```typescript
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

const result = await raceAgents(
  [fastAgent, smartAgent],
  'What is TypeScript?',
  { timeoutMs: 5000 }
);

console.log(`Winner: ${result.winningAgent.name}`);
console.log(result.finalOutput);
console.log('Participants:', result.metadata.raceParticipants);
console.log('Winners:', result.metadata.raceWinners);
```

### `tool(config)`

Create a tool definition from a function (similar to OpenAI's @function_tool). This follows the AI SDK v5 tool format with inputSchema. Tools can access execution context automatically.

**Signature:**
```typescript
function tool<TParams extends z.ZodObject<any>>(
  config: {
    name?: string;
    description: string;
    parameters: TParams;
    execute: (args: z.infer<TParams>, context?: any) => Promise<any> | any;
    enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
  }
): CoreTool
```

**Parameters:**
- `config.name` - Optional tool name (defaults to function name)
- `config.description` - Description of what the tool does
- `config.parameters` - Zod schema for parameter validation
- `config.execute` - Tool execution function (context is auto-injected)
- `config.enabled` - Optional boolean or function to conditionally enable/disable tool

**Returns:** Tool definition ready for use in agents

**Example:**
```typescript
const calculator = tool({
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate')
  }),
  execute: async ({ expression }) => {
    return { result: eval(expression) };
  }
});

// With context access
const userTool = tool({
  description: 'Get user data',
  parameters: z.object({ userId: z.string() }),
  execute: async ({ userId }, context) => {
    // Context is automatically injected
    return await context.context.db.users.findOne({ id: userId });
  }
});
```

## Agent Class

### `Agent`

Main agent class for creating AI agents with instructions, tools, and handoffs.

**Signature:**
```typescript
class Agent<TContext = any, TOutput = string> {
  constructor(config: AgentConfig<TContext, TOutput>);
  
  // Static factory method for better TypeScript inference
  static create<TContext, TOutput>(
    config: AgentConfig<TContext, TOutput>
  ): Agent<TContext, TOutput>;
  
  // Convert agent to a tool (for "agent as tool" pattern)
  asTool(options?: {
    toolName?: string;
    toolDescription?: string;
  }): CoreTool;
  
  // Clone agent with optional property overrides
  clone(overrides: Partial<AgentConfig<TContext, TOutput>>): Agent<TContext, TOutput>;
  
  // Get/set handoffs
  get handoffs(): Agent<TContext, any>[];
  set handoffs(agents: Agent<TContext, any>[]);
  
  // Read-only properties
  readonly name: string;
  readonly handoffDescription?: string;
}
```

**Example:**
```typescript
// Create agent
const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are helpful.'
});

// Create agent with TOON encoding enabled
const dataAgent = new Agent({
  name: 'Data Agent',
  instructions: 'You analyze data.',
  tools: {
    getData: tool({
      description: 'Get large dataset',
      inputSchema: z.object({ count: z.number() }),
      execute: async ({ count }) => {
        return { data: [...], total: count };
      }
    })
  },
  useTOON: true  // Enable automatic TOON encoding (18-33% token reduction)
});

// Or use static factory
const agent2 = Agent.create({
  name: 'helper',
  instructions: 'Help users'
});

// Convert to tool
const agentTool = agent.asTool({
  toolDescription: 'Delegate to assistant agent'
});

// Clone with overrides
const specializedAgent = agent.clone({
  name: 'specialist',
  instructions: 'You are a specialist'
});
```

**AgentConfig:**
```typescript
interface AgentConfig<TContext, TOutput> {
  name: string;
  instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
  model?: LanguageModel;
  tools?: Record<string, CoreTool>;
  handoffs?: Agent<TContext, any>[];
  handoffDescription?: string;
  guardrails?: Guardrail<TContext>[];
  outputSchema?: z.ZodSchema<TOutput>;
  outputType?: z.ZodSchema<TOutput>;  // Alias for outputSchema
  maxSteps?: number;
  modelSettings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  };
  onStepFinish?: (step: StepResult) => void | Promise<void>;
  shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
  useTOON?: boolean;  // If true, automatically encode all tool results to TOON format (18-33% token reduction)
}
```

**Example:**
```typescript
const agent = new Agent({
  name: 'assistant',
  model: openai('gpt-4o'),
  instructions: 'You are a helpful assistant.',
  tools: { calculator },
  maxSteps: 10
});
```

## Session Management

### `SessionManager`

Session manager for creating and managing sessions of different types. Provides a unified interface for session creation.

**Signature:**
```typescript
class SessionManager {
  constructor(config: SessionManagerConfig);
  
  getSession<TContext = any>(sessionId: string): Session<TContext>;
  deleteSession(sessionId: string): Promise<void>;
  clearCache(): void; // Clear cached session instances
}

interface SessionManagerConfig {
  type: 'memory' | 'redis' | 'database' | 'hybrid';
  redis?: Redis; // Required for redis/hybrid types
  db?: any; // Required for database/hybrid types
  redisKeyPrefix?: string;
  redisTTL?: number;
  dbCollectionName?: string;
  maxMessages?: number;
  syncToDBInterval?: number; // For hybrid sessions
  summarization?: SummarizationConfig;
}
```

**Example:**
```typescript
// Memory sessions
const memoryManager = new SessionManager({
  type: 'memory',
  maxMessages: 50
});

// Redis sessions
const redisManager = new SessionManager({
  type: 'redis',
  redis,
  maxMessages: 50,
  redisTTL: 3600
});

// Hybrid sessions
const hybridManager = new SessionManager({
  type: 'hybrid',
  redis,
  db,
  maxMessages: 100,
  syncToDBInterval: 5
});

const session = hybridManager.getSession('user-123');
await run(agent, 'Hello', { session });
```

### `MemorySession`

In-memory session storage for development and testing. Messages are stored in memory and lost when the process exits.

**Signature:**
```typescript
class MemorySession<TContext = any> implements Session<TContext> {
  constructor(
    id: string,
    maxMessages?: number,
    summarizationConfig?: SummarizationConfig
  );
  
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
}
```

**Example:**
```typescript
const session = new MemorySession('user-123', 50); // id, maxMessages

await run(agent, 'Hello', { session });
await run(agent, 'What did I say?', { session }); // Remembers context
```

### `RedisSession`

Redis-backed session storage for production use. Provides fast access with automatic expiration.

**Signature:**
```typescript
class RedisSession<TContext = any> implements Session<TContext> {
  constructor(
    id: string,
    config: RedisSessionConfig
  );
  
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
  refreshTTL(): Promise<void>; // Refresh time-to-live
}

interface RedisSessionConfig {
  redis: Redis;
  keyPrefix?: string; // Default: 'agent:session:'
  ttl?: number; // Time to live in seconds (default: 3600)
  maxMessages?: number;
  summarization?: SummarizationConfig;
}
```

**Example:**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

const session = new RedisSession('user-123', {
  redis,
  ttl: 3600, // 1 hour
  maxMessages: 50
});

await run(agent, 'Hello', { session });
await session.refreshTTL(); // Keep session alive
```

### `DatabaseSession`

MongoDB-backed session storage for production use. Provides durable storage with automatic message management.

**Signature:**
```typescript
class DatabaseSession<TContext = any> implements Session<TContext> {
  constructor(
    id: string,
    config: DatabaseSessionConfig
  );
  
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
}

interface DatabaseSessionConfig {
  db: any; // MongoDB Database instance
  collectionName?: string; // Default: 'agent_sessions'
  maxMessages?: number;
  summarization?: SummarizationConfig;
}
```

**Example:**
```typescript
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

### `HybridSession`

Hybrid session storage combining Redis (fast) and MongoDB (durable). Reads from Redis first, falls back to MongoDB, and syncs periodically.

**Signature:**
```typescript
class HybridSession<TContext = any> implements Session<TContext> {
  constructor(
    id: string,
    config: HybridSessionConfig
  );
  
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
  syncToDatabase(): Promise<void>; // Manually sync Redis to MongoDB
}

interface HybridSessionConfig {
  redis: Redis;
  db: any; // MongoDB Database instance
  redisKeyPrefix?: string;
  redisTTL?: number; // Redis TTL in seconds
  dbCollectionName?: string; // Default: 'agent_sessions'
  maxMessages?: number;
  syncToDBInterval?: number; // Sync to DB every N messages (default: 5)
  summarization?: SummarizationConfig;
}
```

**Example:**
```typescript
const session = new HybridSession('user-123', {
  redis,
  db,
  redisTTL: 3600,
  dbCollectionName: 'sessions',
  syncToDBInterval: 5
});

await run(agent, 'Hello', { session });
await session.syncToDatabase(); // Force sync before shutdown
```

## Guardrails

### Built-in Guardrails

Guardrails are configured in `AgentConfig`, not `RunOptions`.

```typescript
// Content safety
contentSafetyGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  categories?: string[];
  threshold?: number;
}): Guardrail<TContext>

// PII detection
piiDetectionGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  block?: boolean;
  categories?: string[];
}): Guardrail<TContext>

// Length validation
lengthGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  minLength?: number;
  maxLength?: number;
  unit?: 'characters' | 'words' | 'tokens';
}): Guardrail<TContext>

// Language validation
languageGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  allowedLanguages: string[];
}): Guardrail<TContext>

// Topic relevance
topicRelevanceGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  allowedTopics: string[];
  threshold?: number;
}): Guardrail<TContext>

// Format validation
formatValidationGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  format: 'json' | 'xml' | 'yaml' | 'markdown';
  schema?: z.ZodSchema;
}): Guardrail<TContext>

// Rate limiting
rateLimitGuardrail<TContext>(config: {
  name?: string;
  storage: Map<string, { count: number; resetAt: number }>;
  maxRequests: number;
  windowMs: number;
  keyExtractor: (context: RunContextWrapper<TContext>) => string;
}): Guardrail<TContext>

// Sentiment
sentimentGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  blockedSentiments?: ('positive' | 'negative' | 'neutral')[];
  allowedSentiments?: ('positive' | 'negative' | 'neutral')[];
}): Guardrail<TContext>

// Toxicity
toxicityGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  threshold?: number;
}): Guardrail<TContext>

// Custom guardrail
customGuardrail<TContext>(config: {
  name: string;
  type: 'input' | 'output';
  validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}): Guardrail<TContext>
```

**Example:**
```typescript
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
```

## AI Tools

### Embeddings

```typescript
// Single embedding
function generateEmbeddingAI(options: {
  model: EmbeddingModel;
  value: string;
}): Promise<EmbeddingResult>

// Batch embeddings
function generateEmbeddingsAI(options: {
  model: EmbeddingModel;
  values: string[];
}): Promise<EmbeddingsResult>

// Similarity calculation
function cosineSimilarity(a: number[], b: number[]): number

// Tool creator
function createEmbeddingTool(model: EmbeddingModel): CoreTool
```

### Image Generation

```typescript
function generateImageAI(options: {
  model: LanguageModel;
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024';
}): Promise<GenerateImageResult>

function createImageGenerationTool(model: LanguageModel): CoreTool
```

### Audio

```typescript
// Transcription
function transcribeAudioAI(options: {
  model: LanguageModel;
  audio: Buffer | string;
}): Promise<TranscribeAudioResult>

function createTranscriptionTool(model: LanguageModel): CoreTool

// Text-to-Speech
function generateSpeechAI(options: {
  model: LanguageModel;
  text: string;
  voice?: string;
}): Promise<GenerateSpeechResult>

function createTextToSpeechTool(model: LanguageModel): CoreTool
```

### Reranking

```typescript
function rerankDocuments(options: {
  model: RerankingModel;
  query: string;
  documents: string[] | object[];
  topN?: number;
}): Promise<RerankResult>

function createRerankTool(model: RerankingModel): CoreTool
```

## Tracing

### Langfuse Integration

```typescript
function initializeLangfuse(config: {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
}): void

function shutdownLangfuse(): Promise<void>

function isLangfuseEnabled(): boolean
```

**Example:**
```typescript
initializeLangfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY
});

// Tracing happens automatically for all agent runs
await run(agent, 'Hello');
```

### Generic Tracing

```typescript
class TraceManager {
  startTrace(name: string, metadata?: Record<string, any>): Trace;
  endTrace(trace: Trace): void;
}

function getGlobalTraceManager(): TraceManager;

function createConsoleCallback(): TraceCallback;
function createLangfuseCallback(): TraceCallback;
```

## MCP Integration

### MCP Server Management

```typescript
class MCPServerManager {
  registerServer(config: MCPServerConfig): Promise<void>;
  getTools(): Promise<Record<string, ToolDefinition>>;
  getServerTools(serverName: string): Promise<Record<string, ToolDefinition>>;
  shutdown(): Promise<void>;
}

function registerMCPServer(config: MCPServerConfig): Promise<void>;
function getMCPTools(): Promise<Record<string, ToolDefinition>>;
function getGlobalMCPManager(): MCPServerManager;
function shutdownMCPServers(): Promise<void>;
```

**MCPServerConfig:**
```typescript
interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  tools?: string[];
}
```

**Example:**
```typescript
await registerMCPServer({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem'],
  env: { ...process.env }
});

// Get all tools from all servers
const tools = await getMCPTools();

// Or get tools from specific server
const manager = getGlobalMCPManager();
const filesystemTools = await manager.getServerTools('filesystem');

const agent = new Agent({
  tools: { ...tools }
});
```

## Approvals

### Approval Management

```typescript
class ApprovalManager {
  requiresApproval(toolName: string, config?: ApprovalConfig): boolean;
  requestApproval(
    toolName: string,
    args: any,
    config: ApprovalConfig
  ): Promise<ApprovalResponse>;
  getPendingApproval(token: string): PendingApproval | undefined;
  submitApproval(token: string, response: ApprovalResponse): void;
  getPendingApprovals(): PendingApproval[];
  clearExpired(maxAge?: number): void;
}

function getGlobalApprovalManager(): ApprovalManager;

function createCLIApprovalHandler(): ApprovalConfig['requestApproval'];
function createWebhookApprovalHandler(
  webhookUrl: string,
  apiKey?: string
): ApprovalConfig['requestApproval'];
function createAutoApproveHandler(): ApprovalConfig['requestApproval'];
function createAutoRejectHandler(): ApprovalConfig['requestApproval'];
```

**Note:** Approval system is configured at the tool level, not in RunOptions. Tools must manually call `requestApproval()` in their execute function.

## Types

### Core Types

```typescript
interface RunContextWrapper<TContext> {
  context: TContext;
  agent: Agent;
  messages: CoreMessage[];
  usage: Usage;
}

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

interface Usage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

interface GuardrailResult {
  passed: boolean;
  message?: string;
  metadata?: Record<string, any>;
}
```

## Errors

### Error Classes

```typescript
class MaxTurnsExceededError extends Error;
class GuardrailTripwireTriggered extends Error;
class ToolExecutionError extends Error;
class HandoffError extends Error;
class ApprovalRequiredError extends Error;
```

**Example:**
```typescript
try {
  await run(agent, 'Hello');
} catch (error) {
  if (error instanceof MaxTurnsExceededError) {
    // Handle max turns
  } else if (error instanceof GuardrailTripwireTriggered) {
    // Handle guardrail failure
  }
}
```

---

For more details, see:
- [Getting Started](../getting-started/GETTING_STARTED.md)
- [Core Concepts](../guides/CORE_CONCEPTS.md)
- [Features Guide](../guides/FEATURES.md)
