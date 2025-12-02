# CORRECT LANGFUSE TRACING STRUCTURE

## ❌ Current (Wrong)

```
Trace: Agent Run
├─ Agent: Coordinator (parentObservationId: null)
   └─ Agent: DataCollector (parentObservationId: Coordinator)
      └─ Agent: Analyst (parentObservationId: DataCollector)
         └─ Agent: Writer (parentObservationId: Analyst)
```

**Problem:** Agents nested under each other, no clear flow

---

## ✅ Correct Structure

```
Trace: Agent Run (User Input → Final Output)
│  Input: "Create market analysis..."
│  Output: "Here is the comprehensive report..."
│
├─ Span: Input Guardrails
│  └─ Guardrail: length_check (PASS)
│
├─ Span: Agent: Coordinator
│  ├─ Generation: LLM Call #1
│  │  └─ Tokens: 163 input, 50 output
│  └─ Tool: transfer_to_datacollector
│
├─ Span: Agent: DataCollector
│  ├─ Generation: LLM Call #2
│  │  └─ Tokens: 200 input, 30 output
│  └─ Tool: gatherData
│     └─ Output: {dataPoints: [...]}
│
├─ Span: Agent: Analyst
│  ├─ Generation: LLM Call #3
│  └─ Tool: analyzeData
│
├─ Span: Agent: Writer  
│  ├─ Generation: LLM Call #4
│  └─ Tool: createReport
│
├─ Span: Agent: Reviewer
│  ├─ Generation: LLM Call #5
│  └─ Tool: reviewReport
│
└─ Span: Output Guardrails
   └─ Guardrail: length_check (PASS)
```

---

## Key Principles

1. **ONE Trace** = ONE user request → response cycle
2. **Trace has input/output** at the top level
3. **All agents are SIBLINGS** (same level)
4. **Guardrails are SIBLINGS** of agents
5. **LLM generations nested under agents**
6. **Tools nested under agents**

---

## Implementation

### 1. Create trace with input
```typescript
const trace = createTrace({
  name: 'Agent Run',
  input: userInput,  // Set immediately
  // output will be set at the end
});
```

### 2. Create agent spans as SIBLINGS of trace
```typescript
// All agents should be children of the TRACE, not each other
const agentSpan = trace.span({
  name: `Agent: ${agentName}`,
  // No parentObservationId - directly under trace
});
```

### 3. Update trace output at the end
```typescript
trace.update({
  output: finalOutput
});
```

---

## What We Need to Fix

1. ✅ Agent spans should be **direct children of trace** (siblings)
2. ✅ Trace should have **final output** attached
3. ✅ Guardrail spans should be at **trace level**
4. ✅ Clear **input → output** flow visible

---

## Langfuse Hierarchy

```
Trace
├─ Span (direct child)
│  ├─ Span (nested)
│  └─ Generation (nested)
├─ Span (direct child - sibling of first)
└─ Span (direct child - sibling)
```

NOT:
```
Trace
└─ Span
   └─ Span
      └─ Span (deeply nested - WRONG!)
```

