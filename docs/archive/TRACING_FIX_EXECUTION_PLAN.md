# COMPLETE LANGFUSE TRACING FIX - Execution Plan

## 🎯 Goal
Create proper end-to-end tracing where:
- ✅ ONE trace shows complete user input → final output
- ✅ All agents are SIBLINGS (not nested)
- ✅ Total tokens visible at TRACE level
- ✅ Input/Output guardrails visible as spans
- ✅ All LLM generations tracked with tokens
- ✅ All tools tracked with inputs/outputs
- ✅ Clear visibility into the entire flow

---

## 📊 Correct Structure

```
TRACE: Agent Run
├─ input: "User query..."
├─ output: "Final response..."
├─ metadata: 
│  ├─ totalTokens: 15,234
│  ├─ totalCost: $0.023
│  ├─ duration: 12.5s
│  └─ agentCount: 5
│
├─ SPAN: Input Guardrails (level 1)
│  ├─ Guardrail: length_check → PASS
│  └─ Guardrail: pii_detection → PASS
│
├─ SPAN: Agent: Coordinator (level 1 - SIBLING)
│  ├─ input: messages
│  ├─ output: transfer decision
│  ├─ GENERATION: LLM Call
│  │  ├─ input: {system, messages, tools}
│  │  ├─ output: {text, toolCalls}
│  │  └─ usage: {input: 163, output: 50, total: 213}
│  └─ SPAN: Tool: transfer_to_datacollector
│     ├─ input: {reason, query}
│     └─ output: {__transfer: true}
│
├─ SPAN: Agent: DataCollector (level 1 - SIBLING)
│  ├─ GENERATION: LLM Call
│  │  └─ usage: {input: 200, output: 30, total: 230}
│  └─ SPAN: Tool: gatherData
│     ├─ input: {topic}
│     └─ output: {dataPoints, sources}
│
├─ SPAN: Agent: Analyst (level 1 - SIBLING)
│  ├─ GENERATION: LLM Call
│  │  └─ usage: {input: 300, output: 50, total: 350}
│  └─ SPAN: Tool: analyzeData
│
├─ SPAN: Agent: Writer (level 1 - SIBLING)
│  ├─ GENERATION: LLM Call
│  │  └─ usage: {input: 400, output: 200, total: 600}
│  └─ SPAN: Tool: createReport
│
├─ SPAN: Agent: Reviewer (level 1 - SIBLING)
│  ├─ GENERATION: LLM Call
│  │  └─ usage: {input: 500, output: 100, total: 600}
│  └─ SPAN: Tool: reviewReport
│
└─ SPAN: Output Guardrails (level 1)
   ├─ Guardrail: length_check → PASS
   └─ Guardrail: pii_detection → PASS
```

---

## 🔧 Changes Required

### 1. Fix Trace Creation
**File:** `src/core/runner.ts`
- ✅ Create trace with input immediately
- ✅ Store trace in state
- ✅ Update trace with output at END
- ✅ Add total token metadata

### 2. Fix Agent Span Creation
**File:** `src/core/runner.ts`
- ❌ REMOVE: `createContextualSpan()` for agents
- ✅ USE: `trace.span()` directly
- ✅ Make all agents siblings

### 3. Fix LLM Generation Spans
**File:** `src/core/runner.ts`
- ✅ Create generation spans from agent span
- ✅ Track tokens properly
- ✅ Include model name

### 4. Fix Tool Spans
**File:** `src/core/execution.ts`
- ✅ Create tool spans from current agent span
- ✅ Include input/output
- ✅ Track duration

### 5. Fix Guardrail Spans
**File:** `src/core/runner.ts`
- ✅ Create guardrail spans from TRACE
- ✅ Show pass/fail status
- ✅ Include feedback

### 6. Add Token Aggregation
**File:** `src/core/runner.ts`
- ✅ Track total tokens across all agents
- ✅ Calculate total cost
- ✅ Add to trace metadata

---

## 📝 Implementation Steps

### Step 1: Update Trace Creation ✅
```typescript
// At start of execute()
const trace = createTrace({
  name: `Agent Run: ${agent.name}`,
  input: initialInput,  // Set immediately!
  metadata: {
    agentName: agent.name,
    maxTurns,
  },
  tags: ['agent', 'run', 'agentic'],
});

state.trace = trace;
```

### Step 2: Create Agent Spans as Siblings
```typescript
// In execution loop - DON'T use createContextualSpan!
const agentSpan = state.trace.span({
  name: `Agent: ${state.currentAgent.name}`,
  input: { messages: formatMessagesForLangfuse(state.messages) },
  metadata: {
    agentName: state.currentAgent.name,
    tools: Object.keys(state.currentAgent._tools),
    turn: state.currentTurn,
  },
});

state.currentAgentSpan = agentSpan;
```

### Step 3: Create Guardrail Spans from Trace
```typescript
// Input guardrails
const guardrailSpan = state.trace.span({
  name: 'Input Guardrails',
  metadata: { type: 'input' }
});

// For each guardrail
const checkSpan = guardrailSpan.span({
  name: `Guardrail: ${guardrail.name}`,
  input: { content: ... },
  output: { passed: true/false, message: ... }
});
```

### Step 4: Update Trace at End
```typescript
// At the END of execute()
trace.update({
  output: {
    finalOutput,
    agentPath: state.handoffChain,
    success: true
  },
  metadata: {
    totalTokens: state.totalTokens,
    totalCost: calculateCost(state.totalTokens),
    duration: Date.now() - startTime,
    agentCount: state.agentMetrics.size,
    toolCallsCount: state.totalToolCalls,
  }
});

await langfuse.flushAsync();
```

### Step 5: Fix Context Management
```typescript
// DON'T store agent span in AsyncLocalStorage context
// This causes nesting!

// INSTEAD: Store only trace in context
runWithTraceContext(trace, async () => {
  // Agent spans created directly from trace
  // NOT from context
});
```

---

## ✅ Success Criteria

After implementation, Langfuse dashboard should show:

1. **Trace Level:**
   - ✅ Input: user query
   - ✅ Output: final response
   - ✅ Metadata: total tokens, cost, duration, agent count

2. **Agent Spans (all siblings):**
   - ✅ Coordinator
   - ✅ DataCollector
   - ✅ Analyst
   - ✅ Writer
   - ✅ Reviewer

3. **Each Agent Span Contains:**
   - ✅ LLM Generation(s) with tokens
   - ✅ Tool execution(s) with input/output
   - ✅ Clear timing data

4. **Guardrails:**
   - ✅ Input Guardrails span
   - ✅ Output Guardrails span
   - ✅ Each check result visible

5. **Token Visibility:**
   - ✅ Per-generation tokens
   - ✅ Total tokens at trace level
   - ✅ Cost calculation

---

## 🚀 Execution Order

1. Fix `runWithTraceContext` to not nest spans
2. Update agent span creation in runner
3. Update guardrail span creation
4. Update trace output at end
5. Add token aggregation
6. Test with simple example
7. Test with multi-agent coordination
8. Verify Langfuse dashboard structure

---

## 📦 Files to Modify

1. `src/tracing/context.ts` - Fix context nesting
2. `src/core/runner.ts` - Main changes (agent spans, guardrails, trace output)
3. `src/core/execution.ts` - Tool span creation
4. `src/lifecycle/langfuse/index.ts` - Helper functions if needed

---

## ⏱️ Estimated: 20-30 tool calls

Let's do this properly! 🚀

