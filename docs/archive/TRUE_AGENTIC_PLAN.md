# TRUE AGENTIC ARCHITECTURE - Implementation Plan

**Date:** December 2, 2025  
**Goal:** Clean separation of concerns with maximum performance and proper transfer/context isolation

---

## 🎯 **KEY CHANGES**

### 1. Terminology
- ❌ `handoffs` → ✅ `subagents`
- ❌ `handoff_to_X` → ✅ `transfer_to_X`
- ❌ `handoffDescription` → ✅ `transferDescription`

### 2. Architecture
```
Current (All-in-one):
agent.ts (2063 lines) - EVERYTHING

New (Separated):
agent.ts (500 lines) - Agent class only
runner.ts (300 lines) - Orchestration  
executor.ts (400 lines) - Tool/transfer execution
transfers.ts (100 lines) - Transfer logic
```

### 3. Context Isolation
```typescript
// OLD: Carries all messages
messages = [...allPreviousMessages, ...toolResults, ...responses]

// NEW: Fresh start for each agent
transfer(toAgent) {
  // Only pass user query, not history
  return runner.execute(toAgent, userQuery, { isolated: true })
}
```

---

## 📋 **IMPLEMENTATION STEPS**

### Step 1: Update Agent Config
```typescript
export interface AgentConfig<TContext = any, TOutput = string> {
  name: string;
  instructions: string | ((context: RunContextWrapper<TContext>) => string | Promise<string>);
  model?: LanguageModel;
  tools?: Record<string, CoreTool>;
  
  // NEW: subagents instead of handoffs
  subagents?: Agent<TContext, any>[];
  transferDescription?: string;
  
  // DEPRECATED (for backward compatibility)
  handoffs?: Agent<TContext, any>[];
  handoffDescription?: string;
  
  guardrails?: Guardrail<TContext>[];
  outputSchema?: z.ZodSchema<TOutput>;
  maxSteps?: number;
  modelSettings?: ModelSettings;
}
```

### Step 2: Create Transfer System
```typescript
// src/core/transfers.ts
export interface TransferResult {
  agent: Agent<any, any>;
  reason: string;
  context?: string;
}

export function createTransferTools(
  agent: Agent<any, any>,
  subagents: Agent<any, any>[]
): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};
  
  for (const subagent of subagents) {
    const toolName = `transfer_to_${subagent.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    tools[toolName] = {
      description: subagent.transferDescription || `Transfer to ${subagent.name}`,
      inputSchema: z.object({
        reason: z.string().describe('Reason for transfer'),
        query: z.string().optional().describe('Specific query for the agent')
      }),
      execute: async ({ reason, query }) => ({
        __transfer: true,
        agentName: subagent.name,
        reason,
        query: query || null  // Query to pass (isolated)
      })
    };
  }
  
  return tools;
}

export function detectTransfer(
  toolCalls: Array<{ toolName: string; result: any }>,
  currentAgent: Agent<any, any>
): TransferResult | null {
  const subagentMap = new Map(
    currentAgent.subagents.map(a => [a.name, a])
  );
  
  for (const tc of toolCalls) {
    if (tc.result?.__transfer) {
      const agent = subagentMap.get(tc.result.agentName);
      if (agent) {
        return {
          agent,
          reason: tc.result.reason,
          context: tc.result.query  // Isolated query
        };
      }
    }
  }
  
  return null;
}
```

### Step 3: Separate Runner (Performance-Optimized)
```typescript
// src/core/runner.ts
export class AgenticRunner<TContext = any, TOutput = string> {
  private options: RunOptions<TContext>;
  
  constructor(options: RunOptions<TContext> = {}) {
    this.options = options;
  }
  
  async execute(
    agent: Agent<TContext, TOutput>,
    input: string | ModelMessage[],
    options: RunOptions<TContext> = {}
  ): Promise<RunResult<TOutput>> {
    const opts = { ...this.options, ...options };
    
    // Separate execution logic
    return await executeAgentRun(agent, input, opts);
  }
}

// Performance-optimized execution
async function executeAgentRun<TContext, TOutput>(
  agent: Agent<TContext, TOutput>,
  input: string | ModelMessage[],
  options: RunOptions<TContext>
): Promise<RunResult<TOutput>> {
  
  const state = new RunState(agent, input, options.context, options.maxTurns);
  const executor = new ToolExecutor(); // Parallel execution
  
  while (!state.isMaxTurnsExceeded()) {
    // 1. Get agent response
    const response = await agent.generateResponse(state.messages, options);
    
    // 2. Execute tools in parallel (if any)
    if (response.toolCalls.length > 0) {
      const results = await executor.executeParallel(response.toolCalls, agent, state);
      state.addToolResults(results);
      
      // 3. Check for transfer (context isolation)
      const transfer = detectTransfer(results, agent);
      if (transfer) {
        // ISOLATED TRANSFER - fresh start
        const isolatedInput = transfer.context || extractUserQuery(input);
        return await executeAgentRun(
          transfer.agent,
          isolatedInput,  // Only pass the query, not history!
          { ...options, parentAgent: agent.name }
        );
      }
      
      continue;
    }
    
    // 4. Final output
    if (response.text && !response.toolCalls.length) {
      return {
        finalOutput: response.text as TOutput,
        messages: state.messages,
        steps: state.steps,
        metadata: state.getMetadata()
      };
    }
  }
  
  throw new Error('Max turns exceeded');
}
```

### Step 4: Parallel Tool Executor
```typescript
// src/core/executor.ts
export class ToolExecutor {
  async executeParallel(
    toolCalls: ToolCall[],
    agent: Agent<any, any>,
    state: RunState
  ): Promise<ToolResult[]> {
    
    // Execute ALL tools in parallel
    const promises = toolCalls.map(async (tc) => {
      const tool = agent.tools[tc.toolName];
      if (!tool) {
        return {
          toolName: tc.toolName,
          error: 'Tool not found',
          result: null
        };
      }
      
      try {
        const startTime = Date.now();
        const result = await tool.execute(tc.args, state.context);
        const duration = Date.now() - startTime;
        
        return {
          toolName: tc.toolName,
          args: tc.args,
          result,
          duration
        };
      } catch (error) {
        return {
          toolName: tc.toolName,
          args: tc.args,
          error: String(error),
          result: null
        };
      }
    });
    
    // Wait for all tools to complete
    return await Promise.all(promises);
  }
}
```

### Step 5: Context Isolation
```typescript
// OLD: Messages accumulate
transfer(toAgent) {
  messages = [
    ...allUserMessages,
    ...allAssistantMessages,
    ...allToolCalls,
    ...allToolResults,
    { role: 'system', content: 'Transferred to Agent' }
  ];
  // 100+ messages carried over!
}

// NEW: Fresh start
transfer(toAgent) {
  // Extract ONLY the user's query
  const userQuery = extractUserQuery(originalInput);
  
  // Start fresh - no history!
  return executeAgentRun(
    toAgent,
    userQuery,  // Clean query only
    { isolated: true, parentAgent: currentAgent.name }
  );
}
```

### Step 6: End-to-End Tracing
```typescript
// Track transfers in Langfuse
async function executeAgentRun(...) {
  const agentSpan = createAgentSpan(agent.name, {
    parentAgent: options.parentAgent,
    transferReason: options.transferReason,
    isolatedContext: options.isolated
  });
  
  try {
    // ... execution ...
    
    if (transfer) {
      agentSpan.end({
        output: {
          transferTo: transfer.agent.name,
          reason: transfer.reason
        },
        metadata: {
          type: 'transfer',
          isolated: true
        }
      });
      
      // Continue with traced transfer
      return await executeAgentRun(
        transfer.agent,
        isolatedQuery,
        { 
          ...options, 
          parentAgent: agent.name,
          transferReason: transfer.reason
        }
      );
    }
    
    agentSpan.end({ output: finalOutput });
    return result;
  } catch (error) {
    agentSpan.end({ error });
    throw error;
  }
}
```

---

## 🚀 **PERFORMANCE OPTIMIZATIONS**

### 1. Parallel Tool Execution ✅ (Already have this)
```typescript
const results = await Promise.all(toolCalls.map(execute));
```

### 2. Context Isolation = Faster
```typescript
// OLD: Process 100+ messages
messages.length = 150  // Slow!

// NEW: Process only query
messages.length = 1    // Fast!
```

### 3. Lazy Agent Span Creation
```typescript
// Only create span when needed
if (isLangfuseEnabled()) {
  agentSpan = createAgentSpan(...);
}
```

### 4. Tool Execution Timeout
```typescript
async executeWithTimeout(tool, args, timeout = 30000) {
  return Promise.race([
    tool.execute(args),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

---

## 📊 **EXPECTED IMPROVEMENTS**

### Performance
- **Context Isolation:** 50-70% faster (fewer messages to process)
- **Parallel Tools:** Already optimized ✅
- **Cleaner Code:** 30% reduction in lines

### Tracing
```
Langfuse Trace:
├─ Agent: Triage (2s)
│  └─ Transfer to Knowledge (reason: "User question")
├─ Agent: Knowledge (5s) [ISOLATED CONTEXT]
│  ├─ Tool: searchKnowledgeBase (2s)
│  └─ Output: "Alan Turing was..."
└─ Total: 7s
```

### Code Organization
```
Before: agent.ts (2063 lines)
After:
  - agent.ts (500 lines) - Agent class
  - runner.ts (300 lines) - Orchestration
  - executor.ts (200 lines) - Tool execution  
  - transfers.ts (100 lines) - Transfer logic
Total: 1100 lines (46% reduction!)
```

---

## ✅ **MIGRATION GUIDE**

### For Users:
```typescript
// OLD
const agent = new Agent({
  name: 'Triage',
  handoffs: [knowledgeAgent, actionAgent],
  handoffDescription: 'Routes queries'
});

// NEW (backward compatible!)
const agent = new Agent({
  name: 'Triage',
  subagents: [knowledgeAgent, actionAgent],
  transferDescription: 'Routes queries',
  
  // OLD syntax still works!
  // handoffs: [knowledgeAgent, actionAgent]
});
```

### Tool Names:
```typescript
// OLD: handoff_to_knowledge
// NEW: transfer_to_knowledge
```

---

## 🎯 **NEXT STEPS**

1. ✅ Update Agent config (subagents, transferDescription)
2. ⏳ Create transfers.ts
3. ⏳ Refactor runner.ts (use it!)
4. ⏳ Create executor.ts (parallel tools)
5. ⏳ Implement context isolation
6. ⏳ Add end-to-end tracing
7. ⏳ Test performance
8. ⏳ Update tests to use new terminology

---

**Status:** Ready to implement! 🚀

