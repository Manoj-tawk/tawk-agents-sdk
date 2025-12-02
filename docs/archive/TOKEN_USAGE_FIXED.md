# ✅ TOKEN USAGE FIX - COMPLETE

## 🎯 **What Was Fixed:**

Added token usage to agent spans when they end, so Langfuse can properly aggregate and display token costs.

---

## 📝 **Changes Made:**

### File: `src/core/runner.ts`

### Change 1: Agent Switch (Line ~183-195)
**When:** Switching from one agent to another

```typescript
// BEFORE
if (state.currentAgentSpan) {
  state.currentAgentSpan.end();
}

// AFTER
if (state.currentAgentSpan) {
  const prevAgentName = state.currentAgentSpan._agentName;
  const prevAgentMetrics = prevAgentName ? state.agentMetrics.get(prevAgentName) : null;
  
  state.currentAgentSpan.end({
    usage: prevAgentMetrics ? {
      input: prevAgentMetrics.tokens.input,
      output: prevAgentMetrics.tokens.output,
      total: prevAgentMetrics.tokens.total
    } : undefined
  });
}
```

### Change 2: Final Output (Line ~327-341)
**When:** Agent completes successfully

```typescript
// BEFORE
if (state.currentAgentSpan) {
  state.currentAgentSpan.end({
    output: typeof finalOutput === 'string' ? finalOutput.substring(0, 500) : finalOutput,
  });
}

// AFTER
if (state.currentAgentSpan) {
  const agentMetrics = state.agentMetrics.get(state.currentAgent.name);
  
  state.currentAgentSpan.end({
    output: typeof finalOutput === 'string' ? finalOutput.substring(0, 500) : finalOutput,
    usage: agentMetrics ? {
      input: agentMetrics.tokens.input,
      output: agentMetrics.tokens.output,
      total: agentMetrics.tokens.total
    } : undefined
  });
}
```

### Change 3: Transfer (Line ~387-406)
**When:** Agent transfers to another agent

```typescript
// BEFORE
if (state.currentAgentSpan) {
  state.currentAgentSpan.end({
    output: {
      transferTo: nextStep.newAgent.name,
      transferReason: nextStep.reason,
    },
    metadata: {
      type: 'transfer',
      isolated: true
    }
  });
}

// AFTER
if (state.currentAgentSpan) {
  const agentMetrics = state.agentMetrics.get(state.currentAgent.name);
  
  state.currentAgentSpan.end({
    output: {
      transferTo: nextStep.newAgent.name,
      transferReason: nextStep.reason,
    },
    metadata: {
      type: 'transfer',
      isolated: true
    },
    usage: agentMetrics ? {
      input: agentMetrics.tokens.input,
      output: agentMetrics.tokens.output,
      total: agentMetrics.tokens.total
    } : undefined
  });
}
```

---

## ✅ **Expected Results:**

Check your Langfuse dashboard at: https://us.cloud.langfuse.com

You should now see:

```json
"Agent: Triage": {
    "type": "SPAN",
    "inputUsage": 580,      // ← NOW SHOWS TOKENS!
    "outputUsage": 87,      // ← NOW SHOWS TOKENS!
    "totalUsage": 667,      // ← NOW SHOWS TOKENS!
    "totalCost": 0.00232    // ← NOW SHOWS COST!
}

"Agent: Knowledge": {
    "type": "SPAN",
    "inputUsage": 7889,     // ← Sum of all generations
    "outputUsage": 756,     // ← Sum of all generations
    "totalUsage": 8645,     // ← Sum of all generations
    "totalCost": 0.00165    // ← Calculated by Langfuse
}
```

### What Still Shows 0 (CORRECT):
- ✅ **Tools:** No LLM calls → 0 tokens (correct)
- ✅ **Guardrails:** No LLM calls → 0 tokens (correct)

---

## 🎉 **Benefits:**

1. ✅ **Per-Agent Cost Tracking:** See exactly how much each agent costs
2. ✅ **Token Visibility:** Clear breakdown of input/output tokens per agent
3. ✅ **Cost Optimization:** Identify expensive agents and optimize them
4. ✅ **Budget Tracking:** Monitor total costs across multi-agent workflows
5. ✅ **Langfuse Aggregation:** Langfuse now properly aggregates child generation tokens to parent agent spans

---

## 🔍 **How It Works:**

1. **During Execution:** `state.agentMetrics` tracks tokens per agent:
   ```typescript
   state.agentMetrics.get("Knowledge") = {
     agentName: "Knowledge",
     turns: 3,
     tokens: {
       input: 7889,
       output: 756,
       total: 8645
     }
   }
   ```

2. **When Agent Ends:** We pass these accumulated tokens to Langfuse:
   ```typescript
   span.end({
     output: {...},
     usage: {
       input: 7889,
       output: 756,
       total: 8645
     }
   });
   ```

3. **Langfuse Displays:** Tokens and costs visible in dashboard!

---

## ✅ **Status: COMPLETE**

All agent spans now properly report token usage to Langfuse. Check your dashboard! 🎉

