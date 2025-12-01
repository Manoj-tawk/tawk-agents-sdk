# 🔧 IMPLEMENTATION PLAN: Remaining Gaps

**Branch**: `feat/true-agentic-architecture`  
**Focus**: 6 remaining gaps to achieve full parity with OpenAI Agents JS

---

## 🎯 GAP 1: ENHANCED STREAMING SUPPORT

**Priority**: 🟡 Medium | **Effort**: 2-3 weeks | **Impact**: High

### Current State
Basic streaming with limited events:
```typescript
const result = await runStream(agent, input);
for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Target State
Rich event streaming with granular updates:
```typescript
const result = await runStream(agent, input);
for await (const event of result.eventStream) {
  switch (event.type) {
    case 'agent_start':
      console.log('Agent started:', event.agentName);
      break;
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'tool_call_start':
      console.log('Calling tool:', event.toolName);
      break;
    case 'tool_call_end':
      console.log('Tool result:', event.result);
      break;
    case 'handoff':
      console.log(`Handoff: ${event.from} → ${event.to}`);
      break;
  }
}
```

### Implementation Tasks

#### File: `src/core/streaming.ts` (NEW)
```typescript
/**
 * Enhanced streaming with rich events
 */

export type StreamEvent =
  | { type: 'agent_start'; agentName: string; timestamp: number }
  | { type: 'agent_end'; agentName: string; timestamp: number }
  | { type: 'text_delta'; delta: string; timestamp: number }
  | { type: 'text_complete'; text: string; timestamp: number }
  | { type: 'tool_call_start'; toolName: string; args: any; callId: string; timestamp: number }
  | { type: 'tool_call_end'; toolName: string; result: any; callId: string; duration: number; timestamp: number }
  | { type: 'tool_call_error'; toolName: string; error: string; callId: string; timestamp: number }
  | { type: 'handoff'; from: string; to: string; reason?: string; timestamp: number }
  | { type: 'step_complete'; stepNumber: number; timestamp: number }
  | { type: 'guardrail'; type: 'input' | 'output'; name: string; passed: boolean; timestamp: number }
  | { type: 'error'; error: string; timestamp: number }
  | { type: 'done'; result: RunResult<any>; timestamp: number };

export async function* runStreamEnhanced<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> = {}
): AsyncGenerator<StreamEvent, RunResult<TOutput>> {
  // Initialize state
  const state = new RunState(agent, input, options.context || {} as TContext);
  
  yield { type: 'agent_start', agentName: agent.name, timestamp: Date.now() };
  
  // Main loop with event streaming
  while (!state.isMaxTurnsExceeded()) {
    // Call model with streaming
    const modelStream = await streamText({
      model: agent._model,
      messages: state.messages,
      // ...
    });
    
    // Stream text deltas
    for await (const chunk of modelStream.textStream) {
      yield { type: 'text_delta', delta: chunk, timestamp: Date.now() };
    }
    
    // Handle tool calls
    const toolCalls = await modelStream.toolCalls;
    
    for (const tc of toolCalls) {
      yield {
        type: 'tool_call_start',
        toolName: tc.toolName,
        args: tc.args,
        callId: tc.toolCallId,
        timestamp: Date.now(),
      };
      
      const startTime = Date.now();
      try {
        const result = await executeTool(tc);
        yield {
          type: 'tool_call_end',
          toolName: tc.toolName,
          result,
          callId: tc.toolCallId,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      } catch (error) {
        yield {
          type: 'tool_call_error',
          toolName: tc.toolName,
          error: String(error),
          callId: tc.toolCallId,
          timestamp: Date.now(),
        };
      }
    }
    
    // Check for handoff
    if (nextStep.type === 'next_step_handoff') {
      yield {
        type: 'handoff',
        from: state.currentAgent.name,
        to: nextStep.newAgent.name,
        reason: nextStep.reason,
        timestamp: Date.now(),
      };
      state.currentAgent = nextStep.newAgent;
    }
    
    // Step complete
    yield {
      type: 'step_complete',
      stepNumber: state.stepNumber,
      timestamp: Date.now(),
    };
    
    // Check if done
    if (nextStep.type === 'next_step_final_output') {
      const result = createRunResult(state, nextStep.output);
      yield { type: 'done', result, timestamp: Date.now() };
      return result;
    }
  }
}
```

#### File: `src/core/runner.ts` (ENHANCE)
Add streaming method:
```typescript
export class AgenticRunner<TContext, TOutput> {
  // Existing non-streaming execute
  async execute(...): Promise<RunResult<TOutput>> { ... }
  
  // NEW: Streaming execute
  async executeStream(
    agent: Agent<TContext, TOutput>,
    input: string | ModelMessage[],
    options: RunOptions<TContext> = {}
  ): AsyncGenerator<StreamEvent, RunResult<TOutput>> {
    return runStreamEnhanced(agent, input, options);
  }
}
```

**Files to Create/Modify**:
- ✅ Create `src/core/streaming.ts`
- ✅ Enhance `src/core/runner.ts`
- ✅ Update `src/index.ts` exports
- ✅ Add tests: `tests/unit/streaming.test.ts`
- ✅ Add example: `examples/streaming.ts`

---

## 🎯 GAP 2: SERVER-MANAGED CONVERSATIONS

**Priority**: 🟡 Medium | **Effort**: 3-4 weeks | **Impact**: Scalability

### Current State
Client manages all history:
```typescript
const messages = [...allPreviousMessages];
await run(agent, messages);  // Sends everything
```

### Target State
Server manages history, client sends delta:
```typescript
await run(agent, newMessage, {
  conversationId: 'conv-123',
  previousResponseId: 'resp-456',
});
// Only newMessage sent, server has full history
```

### Implementation Tasks

#### File: `src/core/conversations.ts` (NEW)
```typescript
/**
 * Server-managed conversation tracking
 */

export class ConversationManager {
  private conversationId?: string;
  private previousResponseId?: string;
  private sentMessages = new WeakSet<ModelMessage>();
  private serverMessages = new WeakSet<ModelMessage>();
  
  constructor(options?: {
    conversationId?: string;
    previousResponseId?: string;
  }) {
    this.conversationId = options?.conversationId;
    this.previousResponseId = options?.previousResponseId;
  }
  
  /**
   * Filter messages to only include new ones (delta)
   */
  filterDelta(messages: ModelMessage[]): ModelMessage[] {
    return messages.filter(msg => {
      // Skip if already sent
      if (this.sentMessages.has(msg)) return false;
      
      // Skip if from server
      if (this.serverMessages.has(msg)) return false;
      
      return true;
    });
  }
  
  /**
   * Mark messages as sent
   */
  recordSent(messages: ModelMessage[]): void {
    messages.forEach(msg => this.sentMessages.add(msg));
  }
  
  /**
   * Mark messages as from server
   */
  recordServerMessages(messages: ModelMessage[]): void {
    messages.forEach(msg => {
      this.serverMessages.add(msg);
      this.sentMessages.add(msg);  // Server messages are also "sent"
    });
  }
  
  /**
   * Update response ID from server
   */
  updateResponseId(responseId: string): void {
    this.previousResponseId = responseId;
  }
  
  /**
   * Get conversation ID
   */
  getConversationId(): string | undefined {
    return this.conversationId;
  }
  
  /**
   * Get previous response ID
   */
  getPreviousResponseId(): string | undefined {
    return this.previousResponseId;
  }
  
  /**
   * Prime tracker from existing state (for resumption)
   */
  primeFromState(state: RunState): void {
    // Mark all existing messages as sent
    state.messages.forEach(msg => {
      this.sentMessages.add(msg);
      this.serverMessages.add(msg);
    });
  }
}

/**
 * Create a conversation-aware run
 */
export async function runWithConversation<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext> & {
    conversationId?: string;
    previousResponseId?: string;
  }
): Promise<RunResult<TOutput>> {
  const manager = new ConversationManager({
    conversationId: options.conversationId,
    previousResponseId: options.previousResponseId,
  });
  
  // Convert input to messages
  const inputMessages = Array.isArray(input) ? input : [
    { role: 'user' as const, content: input }
  ];
  
  // Filter to delta
  const deltaMessages = manager.filterDelta(inputMessages);
  
  // Run with delta
  const result = await run(agent, deltaMessages, options);
  
  // Update conversation tracker
  manager.recordSent(deltaMessages);
  if (result.metadata.responseId) {
    manager.updateResponseId(result.metadata.responseId);
  }
  
  return result;
}
```

#### File: `src/core/runner.ts` (ENHANCE)
Add conversation support:
```typescript
export interface RunOptions<TContext> {
  // Existing
  context?: TContext;
  session?: any;
  maxTurns?: number;
  
  // NEW: Server conversation support
  conversationId?: string;
  previousResponseId?: string;
}
```

**Files to Create/Modify**:
- ✅ Create `src/core/conversations.ts`
- ✅ Enhance `src/core/runner.ts`
- ✅ Update `src/core/runstate.ts`
- ✅ Add tests: `tests/unit/conversations.test.ts`
- ✅ Add example: `examples/server-conversations.ts`

---

## 🎯 GAP 3: ENHANCED HITL (APPROVALS)

**Priority**: 🟡 Medium | **Effort**: 2-3 weeks | **Impact**: Safety

### Current State
Basic approval with manual checking:
```typescript
const tool = tool({
  description: 'Delete file',
  inputSchema: z.object({ path: z.string() }),
  execute: async ({ path }) => {
    // No approval logic
    await fs.unlink(path);
  },
});
```

### Target State
Dynamic context-aware approvals:
```typescript
const tool = tool({
  description: 'Delete file',
  inputSchema: z.object({ path: z.string() }),
  
  // NEW: Dynamic approval
  needsApproval: async (context, args, callId) => {
    // Check user role
    if (!context.user.isAdmin) return true;
    
    // Check path sensitivity
    if (args.path.includes('/system/')) return true;
    
    // Check deletion history
    if (context.deletionCount > 5) return true;
    
    return false;
  },
  
  execute: async ({ path }) => {
    await fs.unlink(path);
    return 'Deleted';
  },
});

// Auto-handle approvals
const result = await runWithApprovals(agent, input, async (approval) => {
  console.log(`Approve ${approval.toolName}(${JSON.stringify(approval.args)})?`);
  const decision = await getUserInput();
  return { approve: decision === 'yes' };
});
```

### Implementation Tasks

#### File: `src/core/approvals.ts` (ENHANCE)
```typescript
/**
 * Enhanced approval system
 */

export interface ApprovalFunction {
  (
    context: any,
    args: any,
    callId: string
  ): Promise<boolean> | boolean;
}

export interface CoreTool {
  description: string;
  inputSchema: z.ZodObject<any>;
  
  // NEW: Dynamic approval
  needsApproval?: ApprovalFunction;
  
  // Optional: Approval metadata
  approvalMetadata?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    requiredRole?: string;
  };
  
  execute: (args: any, context?: any) => Promise<any>;
}

export interface EnhancedInterruption {
  id: string;
  type: 'tool_approval' | 'human_feedback' | 'policy_check';
  toolName: string;
  args: any;
  callId: string;
  context: any;
  metadata: {
    reason?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requiredApprover?: string;
    timestamp: number;
  };
  status: 'pending' | 'approved' | 'rejected';
}

export class ApprovalManager {
  private pendingApprovals: Map<string, EnhancedInterruption> = new Map();
  
  async checkNeedsApproval(
    tool: CoreTool,
    context: any,
    args: any,
    callId: string
  ): Promise<boolean> {
    if (!tool.needsApproval) return false;
    
    return await tool.needsApproval(context, args, callId);
  }
  
  createInterruption(
    tool: CoreTool,
    args: any,
    callId: string,
    context: any
  ): EnhancedInterruption {
    return {
      id: callId,
      type: 'tool_approval',
      toolName: tool.description,
      args,
      callId,
      context,
      metadata: {
        severity: tool.approvalMetadata?.severity || 'medium',
        timestamp: Date.now(),
        requiredApprover: tool.approvalMetadata?.requiredRole,
      },
      status: 'pending',
    };
  }
  
  approve(callId: string, reason?: string): void {
    const interruption = this.pendingApprovals.get(callId);
    if (interruption) {
      interruption.status = 'approved';
      interruption.metadata.reason = reason;
    }
  }
  
  reject(callId: string, reason?: string): void {
    const interruption = this.pendingApprovals.get(callId);
    if (interruption) {
      interruption.status = 'rejected';
      interruption.metadata.reason = reason;
    }
  }
}
```

#### File: `src/core/execution.ts` (ENHANCE)
Update tool execution to check approvals:
```typescript
export async function executeToolsInParallel<TContext>(
  tools: Record<string, CoreTool>,
  toolCalls: Array<{ toolName: string; args: any; toolCallId?: string }>,
  contextWrapper: RunContextWrapper<TContext>,
  approvalManager: ApprovalManager  // NEW
): Promise<ToolExecutionResult[]> {
  const executionPromises = toolCalls.map(async (toolCall) => {
    const tool = tools[toolCall.toolName];
    const startTime = Date.now();

    // NEW: Check if approval needed
    const needsApproval = await approvalManager.checkNeedsApproval(
      tool,
      contextWrapper.context,
      toolCall.args,
      toolCall.toolCallId || ''
    );

    if (needsApproval) {
      const interruption = approvalManager.createInterruption(
        tool,
        toolCall.args,
        toolCall.toolCallId || '',
        contextWrapper.context
      );
      
      return {
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: null,
        duration: Date.now() - startTime,
        needsApproval: true,
        interruption,
      };
    }

    // Execute tool
    const result = await tool.execute(toolCall.args, contextWrapper);
    
    return {
      toolName: toolCall.toolName,
      args: toolCall.args,
      result,
      duration: Date.now() - startTime,
    };
  });

  return await Promise.all(executionPromises);
}
```

**Files to Create/Modify**:
- ✅ Enhance `src/core/approvals.ts`
- ✅ Modify `src/core/execution.ts`
- ✅ Modify `src/core/hitl.ts`
- ✅ Add tests: `tests/unit/approvals-enhanced.test.ts`
- ✅ Add example: `examples/dynamic-approvals.ts`

---

## 🎯 GAP 4: NATIVE MCP INTEGRATION

**Priority**: 🟡 Medium | **Effort**: 2-3 weeks | **Impact**: DX

### Current State
Manual MCP tool fetching:
```typescript
import { getMCPTools } from 'tawk-agents-sdk';

const mcpTools = await getMCPTools('http://localhost:3000');
const agent = new Agent({
  tools: { ...regularTools, ...mcpTools },
});
```

### Target State
Native MCP in agent config:
```typescript
const agent = new Agent({
  name: 'MCPAgent',
  mcpServers: [
    { url: 'http://localhost:3000', capabilities: ['tools', 'resources'] },
    { url: 'http://localhost:3001', capabilities: ['tools'] },
  ],
  // Tools automatically fetched on run
});
```

### Implementation Tasks

#### File: `src/mcp/manager.ts` (ENHANCE)
```typescript
/**
 * Enhanced MCP manager with lifecycle
 */

export interface MCPServerConfig {
  url: string;
  capabilities?: ('tools' | 'resources' | 'prompts')[];
  auth?: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export class MCPServer {
  private url: string;
  private capabilities: string[];
  private connected: boolean = false;
  private tools: CoreTool[] = [];
  private refreshInterval?: NodeJS.Timeout;
  
  constructor(config: MCPServerConfig) {
    this.url = config.url;
    this.capabilities = config.capabilities || ['tools'];
  }
  
  async connect(): Promise<void> {
    // Connect to MCP server
    // Discover capabilities
    this.connected = true;
  }
  
  async disconnect(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.connected = false;
  }
  
  async listTools(): Promise<CoreTool[]> {
    if (!this.connected) {
      await this.connect();
    }
    
    // Fetch tools from server
    const response = await fetch(`${this.url}/tools`);
    const toolsData = await response.json();
    
    // Convert to CoreTool format
    this.tools = toolsData.map(convertMCPTool);
    return this.tools;
  }
  
  async refreshTools(): Promise<CoreTool[]> {
    return await this.listTools();
  }
  
  startAutoRefresh(interval: number = 60000): void {
    this.refreshInterval = setInterval(() => {
      this.refreshTools().catch(console.error);
    }, interval);
  }
}
```

#### File: `src/core/agent.ts` (ENHANCE)
```typescript
export interface AgentConfig<TContext, TOutput> {
  name: string;
  instructions: string | ((context: TContext) => string | Promise<string>);
  model?: any;
  modelSettings?: any;
  tools?: Record<string, CoreTool>;
  
  // NEW: Native MCP support
  mcpServers?: MCPServerConfig[];
  
  handoffs?: Agent<TContext, any>[];
  handoffDescription?: string;
  outputSchema?: z.ZodObject<any>;
  guardrails?: Guardrail[];
  shouldFinish?: (context: TContext, toolResults: any[]) => boolean;
}

export class Agent<TContext, TOutput> {
  // ... existing
  
  private mcpServers: MCPServer[] = [];
  private mcpToolsCache?: CoreTool[];
  private mcpToolsCacheTime?: number;
  private readonly MCP_CACHE_TTL = 60000; // 1 minute
  
  constructor(config: AgentConfig<TContext, TOutput>) {
    // ... existing
    
    // NEW: Initialize MCP servers
    if (config.mcpServers) {
      this.mcpServers = config.mcpServers.map(cfg => new MCPServer(cfg));
    }
  }
  
  // NEW: Get MCP tools automatically
  async getMcpTools(context: TContext): Promise<CoreTool[]> {
    // Check cache
    if (
      this.mcpToolsCache &&
      this.mcpToolsCacheTime &&
      Date.now() - this.mcpToolsCacheTime < this.MCP_CACHE_TTL
    ) {
      return this.mcpToolsCache;
    }
    
    // Fetch from all servers
    const toolPromises = this.mcpServers.map(server => server.listTools());
    const toolArrays = await Promise.all(toolPromises);
    const allTools = toolArrays.flat();
    
    // Cache
    this.mcpToolsCache = allTools;
    this.mcpToolsCacheTime = Date.now();
    
    return allTools;
  }
  
  // NEW: Get all tools (regular + MCP)
  async getAllTools(context: TContext): Promise<Record<string, CoreTool>> {
    const mcpTools = await this.getMcpTools(context);
    
    const allTools: Record<string, CoreTool> = { ...this._tools };
    
    // Add MCP tools
    mcpTools.forEach((tool, index) => {
      const name = `mcp_${index}_${tool.description.split(' ')[0]}`;
      allTools[name] = tool;
    });
    
    return allTools;
  }
  
  // NEW: Cleanup MCP connections
  async cleanup(): Promise<void> {
    await Promise.all(this.mcpServers.map(server => server.disconnect()));
  }
}
```

**Files to Create/Modify**:
- ✅ Enhance `src/mcp/manager.ts`
- ✅ Modify `src/core/agent.ts`
- ✅ Modify `src/core/runner.ts`
- ✅ Add tests: `tests/unit/mcp-native.test.ts`
- ✅ Add example: `examples/native-mcp.ts`

---

## 🎯 GAP 5: PROMPT TEMPLATES

**Priority**: 🟢 Low | **Effort**: 1-2 weeks | **Impact**: Nice-to-have

### Implementation Tasks

#### File: `src/prompts/templates.ts` (NEW)
```typescript
/**
 * Prompt template system
 */

export interface PromptTemplate {
  name: string;
  version: number;
  template: string;
  parameters: Record<string, PromptParameter>;
  metadata?: {
    description?: string;
    author?: string;
    tags?: string[];
  };
}

export interface PromptParameter {
  type: 'string' | 'number' | 'boolean';
  description: string;
  default?: any;
  required?: boolean;
}

export class PromptManager {
  private templates: Map<string, Map<number, PromptTemplate>> = new Map();
  
  register(template: PromptTemplate): void {
    if (!this.templates.has(template.name)) {
      this.templates.set(template.name, new Map());
    }
    this.templates.get(template.name)!.set(template.version, template);
  }
  
  get(name: string, version?: number): PromptTemplate | undefined {
    const versions = this.templates.get(name);
    if (!versions) return undefined;
    
    if (version) {
      return versions.get(version);
    }
    
    // Get latest version
    const latestVersion = Math.max(...Array.from(versions.keys()));
    return versions.get(latestVersion);
  }
  
  render(template: PromptTemplate, params: Record<string, any>): string {
    let result = template.template;
    
    // Replace parameters
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    return result;
  }
}

// Usage
const supportPrompt: PromptTemplate = {
  name: 'customer-support',
  version: 2,
  template: `You are a {{tone}} customer support agent for {{companyName}}.
Your goal is to {{goal}}.`,
  parameters: {
    tone: { type: 'string', description: 'Tone of voice', default: 'friendly' },
    companyName: { type: 'string', description: 'Company name', required: true },
    goal: { type: 'string', description: 'Primary goal', default: 'help customers' },
  },
};

const manager = new PromptManager();
manager.register(supportPrompt);

const agent = new Agent({
  name: 'Support',
  prompt: {
    name: 'customer-support',
    version: 2,
    parameters: { companyName: 'Tawk', tone: 'professional' },
  },
});
```

**Files to Create/Modify**:
- ✅ Create `src/prompts/templates.ts`
- ✅ Create `src/prompts/manager.ts`
- ✅ Modify `src/core/agent.ts`
- ✅ Add tests: `tests/unit/prompts.test.ts`
- ✅ Add example: `examples/prompt-templates.ts`

---

## 🎯 GAP 6: ENHANCED SESSION PERSISTENCE

**Priority**: 🟡 Medium | **Effort**: 2-3 weeks | **Impact**: Production

### Implementation Tasks

#### File: `src/sessions/enhanced.ts` (NEW)
```typescript
/**
 * Enhanced session with automatic persistence
 */

export interface EnhancedSessionConfig {
  /**
   * Auto-persist after each turn
   */
  autoPersist?: boolean;
  
  /**
   * Persist interval (ms)
   */
  persistInterval?: number;
  
  /**
   * Sanitize binary data
   */
  sanitizeBinary?: boolean;
  
  /**
   * Compression
   */
  compress?: boolean;
}

export abstract class EnhancedSession {
  protected config: EnhancedSessionConfig;
  
  constructor(config: EnhancedSessionConfig = {}) {
    this.config = {
      autoPersist: true,
      persistInterval: 5000,
      sanitizeBinary: true,
      compress: false,
      ...config,
    };
  }
  
  /**
   * Save full run state
   */
  abstract saveState(
    sessionId: string,
    state: RunState
  ): Promise<void>;
  
  /**
   * Load run state
   */
  abstract loadState(sessionId: string): Promise<RunState | null>;
  
  /**
   * Save metadata
   */
  abstract saveMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<void>;
  
  /**
   * Load metadata
   */
  abstract loadMetadata(sessionId: string): Promise<Record<string, any> | null>;
  
  /**
   * Sanitize binary data from state
   */
  protected sanitizeBinaryData(state: RunState): RunState {
    // Remove audio, images, etc.
    const sanitized = { ...state };
    
    sanitized.messages = state.messages.map(msg => {
      if (typeof msg.content === 'string') {
        return msg;
      }
      
      // Filter out binary content
      return {
        ...msg,
        content: Array.isArray(msg.content)
          ? msg.content.filter((c: any) => c.type === 'text')
          : msg.content,
      };
    });
    
    return sanitized;
  }
}

export class DatabaseSession extends EnhancedSession {
  async saveState(sessionId: string, state: RunState): Promise<void> {
    const sanitized = this.config.sanitizeBinary
      ? this.sanitizeBinaryData(state)
      : state;
    
    // Save to database
    await db.sessions.upsert({
      where: { id: sessionId },
      data: {
        state: JSON.stringify(sanitized),
        updatedAt: new Date(),
      },
    });
  }
  
  async loadState(sessionId: string): Promise<RunState | null> {
    const session = await db.sessions.findUnique({
      where: { id: sessionId },
    });
    
    if (!session) return null;
    
    return JSON.parse(session.state);
  }
}
```

**Files to Create/Modify**:
- ✅ Create `src/sessions/enhanced.ts`
- ✅ Enhance `src/sessions/index.ts`
- ✅ Add tests: `tests/unit/sessions-enhanced.test.ts`
- ✅ Add example: `examples/persistent-sessions.ts`

---

## 📊 IMPLEMENTATION TIMELINE

### Sprint 1-2: Streaming (2-3 weeks)
- Week 1: Design event protocol
- Week 2: Implement streaming engine
- Week 3: Testing & examples

### Sprint 3-4: Server Conversations (3-4 weeks)
- Week 1: Delta calculation
- Week 2: Response chaining
- Week 3: Integration
- Week 4: Testing

### Sprint 5-6: HITL Enhancement (2-3 weeks)
- Week 1: Dynamic approvals
- Week 2: Context-aware logic
- Week 3: Testing & examples

### Sprint 7-8: MCP & Sessions (4-6 weeks)
- Week 1-2: Native MCP
- Week 3-4: Enhanced sessions
- Week 5-6: Testing & docs

### Sprint 9: Prompt Templates (1-2 weeks)
- Week 1: Template system
- Week 2: Manager & examples

**Total Estimated Effort**: 12-16 weeks (3-4 months)

---

## 🎯 QUICK WINS (Start Here)

### 1. Enhanced Streaming (Highest Impact/Effort Ratio)
- Most visible to users
- Improves UX significantly
- 2-3 weeks effort
- **Recommend starting here**

### 2. Native MCP Integration (Best DX Improvement)
- Makes MCP easier to use
- Better developer experience
- 2-3 weeks effort
- **Recommend as second priority**

### 3. HITL Enhancement (Best Safety Improvement)
- Critical for production
- Better control & safety
- 2-3 weeks effort
- **Recommend as third priority**

---

## ✅ FINAL CHECKLIST

After completing all gaps:

- [ ] Enhanced streaming with granular events
- [ ] Server-managed conversations with delta
- [ ] Dynamic context-aware approvals
- [ ] Native MCP integration in agents
- [ ] Prompt template system
- [ ] Enhanced session persistence

**When all done**: ✅ **Full parity with OpenAI Agents JS + Multi-provider advantage**

---

**Current Status**: ✅ Core architecture complete, production-ready for most use cases  
**Remaining Work**: 6 enhancements for full parity (12-16 weeks)  
**Recommendation**: Ship current version, iterate on gaps based on user feedback

