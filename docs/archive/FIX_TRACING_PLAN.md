# FIX LANGFUSE TRACING - Implementation Plan

## Current Problem

❌ Agent spans are **nested** under each other (Coordinator → DataCollector → Analyst)  
❌ Trace has NO final output  
❌ Guardrails are NOT visible as spans  
❌ Can't see the complete input → output flow  

---

## Correct Structure (Research-Based)

```
TRACE: Agent Run
│ input: "User query..."
│ output: "Final response..."  ← MUST BE SET!
│
├─ SPAN: Input Guardrails (direct child of trace)
│  └─ Guardrail check results
│
├─ SPAN: Agent: Coordinator (direct child of trace)
│  ├─ GENERATION: LLM call
│  └─ SPAN: Tool: transfer
│
├─ SPAN: Agent: DataCollector (SIBLING, not nested!)
│  ├─ GENERATION: LLM call
│  └─ SPAN: Tool: gatherData
│
├─ SPAN: Agent: Analyst (SIBLING)
│  ├─ GENERATION: LLM call
│  └─ SPAN: Tool: analyzeData
│
├─ SPAN: Agent: Writer (SIBLING)
│  ├─ GENERATION: LLM call
│  └─ SPAN: Tool: createReport
│
├─ SPAN: Agent: Reviewer (SIBLING)
│  ├─ GENERATION: LLM call
│  └─ SPAN: Tool: reviewReport
│
└─ SPAN: Output Guardrails (direct child of trace)
   └─ Guardrail check results
```

---

## Key Changes Needed

### 1. Create Agent Spans from TRACE, not context
```typescript
// WRONG (current):
const agentSpan = createContextualSpan('Agent: X');  
// This nests under current span

// CORRECT:
const agentSpan = trace.span({
  name: 'Agent: X'
});  
// This creates span as direct child of trace
```

### 2. Update Trace Output at End
```typescript
// At the END of execution:
trace.update({
  output: finalResponse
});
```

### 3. Create Guardrail Spans at Trace Level
```typescript
// Input guardrails - create from trace
const guardrailSpan = trace.span({
  name: 'Input Guardrails'
});

// Output guardrails - create from trace
const outputGuardrailSpan = trace.span({
  name: 'Output Guardrails'
});
```

---

## Implementation Steps

1. **Pass trace through state** ✅ (already done)
2. **Create agent spans from trace.span()** (needs fix)
3. **Create guardrail spans from trace** (needs fix)
4. **Update trace.output at end** (needs fix)
5. **Fix context storage** to not nest agents

---

## Files to Update

1. `src/core/runner.ts` - Main execution loop
2. `src/tracing/context.ts` - Context management
3. `src/lifecycle/langfuse/index.ts` - Trace utilities

---

## Testing

After fixes, Langfuse should show:
- ✅ ONE trace with input + output
- ✅ All agents as siblings
- ✅ Guardrails visible
- ✅ Clear flow from start to finish

