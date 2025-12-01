# 📖 API Reference

Complete API documentation for the Tawk Agents SDK.

## Table of Contents

- [Core Classes](#core-classes)
  - [Agent](#agent)
- [Execution Functions](#execution-functions)
  - [run](#run)
  - [runStream](#runstream)
  - [raceAgents](#raceagents)
- [Sessions](#sessions)
- [Guardrails](#guardrails)
- [Tools](#tools)
- [MCP Integration](#mcp-integration)
- [Approvals](#approvals)
- [Tracing](#tracing)
- [Types](#types)

---

## Core Classes

### Agent

The main agent class.

```typescript
class Agent<TContext = any, TOutput = string>
```

#### Constructor

```typescript
constructor(config: AgentConfig<TContext, TOutput>)
```

**AgentConfig**:

```typescript
interface AgentConfig<TContext = any, TOutput = string> {
  // Required
  name: string;
  model: LanguageModel;
  instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);

  // Optional
  tools?: Record<string, CoreTool>;
  handoffs?: Agent<TContext, any>[];
  handoffDescription?: string;
  guardrails?: Guardrail<TContext>[];
  mcpServers?: MCPServerConfig[];
  maxSteps?: number;
  modelSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  };
  outputSchema?: z.ZodSchema<TOutput>;
}
```

#### Static Methods

```typescript
// Factory method
static create<TContext, TOutput>(
  config: AgentConfig<TContext, TOutput>
): Agent<TContext, TOutput>
```

#### Instance Methods

```typescript
// Convert agent to a tool
asTool(options?: {
  toolName?: string;
  toolDescription?: string;
}): CoreTool

// Clone agent with overrides
clone(overrides: Partial<AgentConfig<TContext, TOutput>>): Agent<TContext, TOutput>

// Cleanup (close MCP connections, etc.)
async cleanup(): Promise<void>
```

#### Properties

```typescript
readonly name: string
readonly handoffDescription?: string
handoffs: Agent<TContext, any>[] // Getter/setter
```

---

## Execution Functions

### run

Execute an agent and return the final result.

```typescript
async function run<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[] | RunState<TContext, any>,
  options?: RunOptions<TContext>
): Promise<RunResult<TOutput>>
```

**RunOptions**:

```typescript
interface RunOptions<TContext = any> {
  session?: Session<TContext>;
  context?: TContext;
  maxTurns?: number;
}
```

**RunResult**:

```typescript
interface RunResult<TOutput = string> {
  finalOutput: TOutput;
  messages: CoreMessage[];
  steps: StepResult[];
  metadata: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    finishReason: string;
    totalToolCalls: number;
    handoffChain?: string[];
    agentMetrics?: AgentMetric[];
  };
  state?: RunState<any, any>;
}
```

### runStream

Execute an agent with streaming output.

```typescript
async function runStream<TContext = any, TOutput = string>(
  agent: Agent<TContext, TOutput>,
  input: string | CoreMessage[],
  options?: RunOptions<TContext>
): Promise<StreamResult<TOutput>>
```

**StreamResult**:

```typescript
interface StreamResult<TOutput = string> {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<StreamEvent>;
  finalOutput: Promise<TOutput>;
  messages: Promise<CoreMessage[]>;
  metadata: Promise<RunMetadata>;
}
```

**StreamEvent**:

```typescript
type StreamEvent =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'tool-call'; toolName: string; args: any; toolCallId: string }
  | { type: 'tool-result'; toolName: string; result: any; toolCallId: string }
  | { type: 'handoff'; from: string; to: string; reason?: string }
  | { type: 'finish'; finalOutput: string }
  | { type: 'error'; error: string };
```

### raceAgents

Run multiple agents in parallel and return the fastest response.

```typescript
async function raceAgents<TContext = any, TOutput = string>(
  agents: Agent<TContext, TOutput>[],
  input: string | CoreMessage[],
  options?: RunOptions<TContext> & { timeoutMs?: number }
): Promise<RunResult<TOutput> & { winningAgent: Agent<TContext, TOutput> }>
```

---

## Sessions

### Session Interface

```typescript
interface Session<TContext = any> {
  readonly id: string;
  addMessages(messages: CoreMessage[]): Promise<void>;
  getHistory(): Promise<CoreMessage[]>;
  clear(): Promise<void>;
  getMetadata(): Promise<Record<string, any>>;
  updateMetadata(metadata: Record<string, any>): Promise<void>;
}
```

### MemorySession

In-memory session storage (development).

```typescript
class MemorySession<TContext = any> implements Session<TContext> {
  constructor(
    id: string,
    maxMessages?: number,
    summarizationConfig?: SummarizationConfig
  )
}
```

### RedisSession

Redis-backed session storage (production).

```typescript
class RedisSession<TContext = any> implements Session<TContext> {
  constructor(id: string, config: RedisSessionConfig)
  
  refreshTTL(): Promise<void> // Refresh time-to-live
}
```

**RedisSessionConfig**:

```typescript
interface RedisSessionConfig {
  redis: Redis;
  maxMessages?: number;
  ttl?: number; // seconds
  keyPrefix?: string;
}
```

### DatabaseSession

MongoDB-backed session storage (production).

```typescript
class DatabaseSession<TContext = any> implements Session<TContext> {
  constructor(id: string, config: DatabaseSessionConfig)
}
```

**DatabaseSessionConfig**:

```typescript
interface DatabaseSessionConfig {
  db: Db; // MongoDB Db instance
  collectionName?: string;
  maxMessages?: number;
}
```

### HybridSession

Redis + MongoDB session storage (production).

```typescript
class HybridSession<TContext = any> implements Session<TContext> {
  constructor(id: string, config: HybridSessionConfig)
  
  syncToDatabase(): Promise<void> // Manual sync Redis to MongoDB
}
```

---

## Guardrails

### Guardrail Interface

```typescript
interface Guardrail<TContext = any> {
  name: string;
  type: 'input' | 'output';
  validate(
    content: string,
    context: RunContextWrapper<TContext>
  ): Promise<GuardrailResult> | GuardrailResult;
}

interface GuardrailResult {
  passed: boolean;
  message?: string;
  metadata?: Record<string, any>;
}
```

### Built-in Guardrails

#### contentSafetyGuardrail

AI-powered content moderation.

```typescript
function contentSafetyGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  model: LanguageModel;
  categories?: string[];
  threshold?: number;
}): Guardrail<TContext>
```

#### piiDetectionGuardrail

PII detection and blocking.

```typescript
function piiDetectionGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  block?: boolean;
  categories?: string[];
}): Guardrail<TContext>
```

#### lengthGuardrail

Length validation.

```typescript
function lengthGuardrail<TContext>(config: {
  name?: string;
  type: 'input' | 'output';
  minLength?: number;
  maxLength?: number;
  unit?: 'characters' | 'words' | 'tokens';
}): Guardrail<TContext>
```

#### Other Guardrails

- `topicRelevanceGuardrail` - Topic relevance checking
- `formatValidationGuardrail` - Format validation (JSON/XML/YAML/Markdown)
- `rateLimitGuardrail` - Rate limiting
- `languageGuardrail` - Language detection
- `sentimentGuardrail` - Sentiment analysis
- `toxicityGuardrail` - Toxicity detection
- `customGuardrail` - Custom validation logic

See full documentation in [Guardrails Guide](../guides/FEATURES.md#guardrails).

---

## Tools

### tool

Create a tool definition.

```typescript
function tool<TArgs = any, TResult = any>(config: {
  description: string;
  inputSchema: z.ZodSchema<TArgs>;
  execute: (args: TArgs, context?: any) => Promise<TResult> | TResult;
  enabled?: boolean | ((context: any) => boolean | Promise<boolean>);
}): CoreTool
```

### toolWithApproval

Wrap a tool with approval logic.

```typescript
function toolWithApproval(
  tool: CoreTool,
  approvalConfig: {
    needsApproval?: (
      context: any,
      args: any,
      callId: string
    ) => Promise<boolean> | boolean;
    approvalMetadata?: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: string;
      requiredRole?: string;
      reason?: string;
    };
  }
): CoreTool
```

---

## MCP Integration

### MCPServerManager

Manage MCP servers.

```typescript
class MCPServerManager {
  registerServer(config: MCPServerConfig): Promise<void>
  getTools(): Promise<Record<string, ToolDefinition>>
  getServerTools(serverName: string): Promise<Record<string, ToolDefinition>>
  shutdown(): Promise<void>
}
```

**MCPServerConfig**:

```typescript
interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}
```

### Global MCP Functions

```typescript
// Register a global MCP server
async function registerMCPServer(config: MCPServerConfig): Promise<void>

// Get tools from all registered MCP servers
async function getMCPTools(): Promise<Record<string, ToolDefinition>>

// Get global MCP manager instance
function getGlobalMCPManager(): MCPServerManager

// Shutdown all MCP servers
async function shutdownMCPServers(): Promise<void>
```

---

## Approvals

### ApprovalManager

Manage approval workflows.

```typescript
class ApprovalManager {
  requiresApproval(toolName: string, config?: ApprovalConfig): boolean
  
  async requestApproval(
    toolName: string,
    args: any,
    config: ApprovalConfig
  ): Promise<ApprovalResponse>
  
  getPendingApproval(token: string): PendingApproval | undefined
  submitApproval(token: string, response: ApprovalResponse): void
  getPendingApprovals(): PendingApproval[]
  clearExpired(maxAge?: number): void
}
```

### Approval Handlers

```typescript
// CLI-based approval
function createCLIApprovalHandler(): ApprovalHandler

// Webhook-based approval
function createWebhookApprovalHandler(
  webhookUrl: string,
  apiKey?: string
): ApprovalHandler

// Auto-approve (for testing)
function createAutoApproveHandler(): ApprovalHandler

// Auto-reject (for testing)
function createAutoRejectHandler(): ApprovalHandler
```

### Global Approval Function

```typescript
function getGlobalApprovalManager(): ApprovalManager
```

---

## Tracing

### Langfuse Integration

```typescript
// Initialize Langfuse
function initializeLangfuse(config?: {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}): Langfuse | null

// Check if tracing is enabled
function isLangfuseEnabled(): boolean

// Flush pending traces
async function flushLangfuse(): Promise<void>

// Shutdown Langfuse
async function shutdownLangfuse(): Promise<void>
```

### Tracing Utilities

```typescript
// Create a trace wrapper
async function withTrace<T>(
  options: {
    name: string;
    userId?: string;
    sessionId?: string;
    input?: any;
    metadata?: Record<string, any>;
  },
  fn: (trace: any) => Promise<T>
): Promise<T>

// Wrap function with tracing span
async function withFunctionSpan<T>(
  trace: any,
  name: string,
  input: any,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T>
```

---

## Types

### Core Message Types

```typescript
type CoreMessage = 
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool'; content: string; toolCallId: string };
```

### Run State

```typescript
class RunState<TContext = any, TAgent = Agent<TContext, any>> {
  readonly originalInput: string | ModelMessage[];
  readonly currentAgent: TAgent;
  messages: ModelMessage[];
  readonly stepNumber: number;
  readonly currentTurn: number;
  readonly maxTurns: number;
  readonly trace?: any;
  
  recordStep(step: StepResult): void;
  incrementTurn(): void;
  isMaxTurnsExceeded(): boolean;
  hasInterruptions(): boolean;
}
```

### Agent Metric

```typescript
interface AgentMetric {
  agentName: string;
  steps: number;
  toolCalls: number;
  handoffs: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}
```

---

## Additional Type Exports

### Streaming Types

```typescript
// Event name types for streaming
type RunItemStreamEventName = 
  | 'message'
  | 'tool_call'
  | 'tool_result'
  | 'handoff'
  | 'guardrail'
  | 'step_complete';

// Union of all streaming events
type RunStreamEvent = 
  | RunRawModelStreamEvent 
  | RunItemStreamEvent 
  | RunAgentUpdatedStreamEvent;
```

### Safe Execution Types

```typescript
// Result type for safe execution
type SafeExecuteResult<T> = [error: null, result: T] | [error: Error, result: null];
```

### Race Agents Types

```typescript
interface RaceAgentsOptions<TContext = any> {
  maxTurns?: number;
  context?: TContext;
  timeout?: number;
}
```

### Approval Types

```typescript
interface ApprovalRequest {
  toolName: string;
  args: any;
  metadata?: Record<string, any>;
}

interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  modifiedArgs?: any;
}

type ApprovalFunction<TContext = any> = (
  context: TContext,
  args: any,
  toolName: string
) => Promise<boolean> | boolean;
```

### Background Result Types

```typescript
interface BackgroundResult<T> {
  type: 'background';
  promise: Promise<T>;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
}

function isBackgroundResult<T>(value: any): value is BackgroundResult<T>;
```

### MCP Types

```typescript
type MCPToolFilter = (tool: MCPTool) => boolean;
```

---

## Advanced Functions

### Tracing Context Functions

```typescript
// Set the current active span
function setCurrentSpan(span: Span | null): void;

// Create a contextual generation (advanced)
function createContextualGeneration(options: {
  name: string;
  input: any;
  model?: string;
  modelParameters?: Record<string, any>;
}): Generation;
```

### AI Generation Functions (Low-level)

```typescript
// Generate speech from text (low-level)
async function generateSpeechAI(options: {
  text: string;
  model: any;
  voice?: string;
}): Promise<{ audio: Buffer; format: string }>;

// Transcribe audio to text (low-level)
async function transcribeAudioAI(options: {
  audio: Buffer | string;
  model: any;
  language?: string;
}): Promise<{ text: string; language?: string }>;

// Generate image from text (low-level)
async function generateImageAI(options: {
  prompt: string;
  model: any;
  size?: string;
  n?: number;
}): Promise<{ images: string[]; revised_prompt?: string }>;
```

**Note**: These are low-level functions. Prefer using the tool wrappers:
- Use `createTextToSpeechTool()` instead of `generateSpeechAI()`
- Use `createTranscriptionTool()` instead of `transcribeAudioAI()`
- Use `createImageGenerationTool()` instead of `generateImageAI()`

---

For more details and examples, see:
- [Getting Started Guide](../getting-started/GETTING_STARTED.md)
- [Features Guide](../guides/FEATURES.md)
- [Examples](../../examples)
