# 🔍 ROOT CAUSE ANALYSIS - Token Usage Not Showing in Langfuse

## 📊 **Current Situation (from your trace):**

### ✅ What's Working:
```json
"LLM Generation: Triage": {
    "type": "GENERATION",
    "inputUsage": 580,
    "outputUsage": 87,
    "totalUsage": 667,
    "totalCost": 0.00232
}
```
**Status:** ✅ **PERFECT** - LLM Generations show tokens correctly

### ❌ What's NOT Working:
```json
"Agent: Triage": {
    "type": "SPAN",
    "inputUsage": 0,
    "outputUsage": 0,
    "totalUsage": 0,
    "totalCost": 0
}

"Tool: searchKnowledgeBase": {
    "type": "SPAN",
    "inputUsage": 0,
    "outputUsage": 0,
    "totalUsage": 0,
    "totalCost": 0
}

"Guardrail: length_check": {
    "type": "SPAN",
    "inputUsage": 0,
    "outputUsage": 0,
    "totalUsage": 0,
    "totalCost": 0
}
```
**Status:** ❌ **PROBLEM** - All show 0 tokens

---

## 🔎 **ROOT CAUSE INVESTIGATION:**

### Question 1: Should Agent Spans show tokens?
**YES!** In proper Langfuse structure, parent spans should aggregate child tokens.

### Question 2: Why are they showing 0?
Let me trace the code flow:

#### Code Location: `src/core/runner.ts`

**When Agent Span ENDS:**
```typescript
// Line 319-321
state.currentAgentSpan.end({
  output: typeof finalOutput === 'string' ? finalOutput.substring(0, 500) : finalOutput,
});
```

**Problem:** ❌ No `usage` parameter passed to `.end()`

**When Generation ENDS:**
```typescript
// Line 253-264
generation.end({
  output: {...},
  usage: {  // ✅ Tokens passed here
    input: usage.inputTokens || 0,
    output: usage.outputTokens || 0,
    total: usage.totalTokens || 0,
  }
});
```

**Problem Found:** ✅ Generations pass tokens, but Agent spans don't!

---

## 🎯 **ROOT CAUSE:**

**Agent spans are NOT passing `usage` parameter to `.end()`**

This means:
- ❌ Langfuse doesn't know how many tokens each agent used
- ❌ Can't calculate cost per agent
- ❌ Can't see aggregated token usage at agent level

---

## 📋 **WHERE TO FIX:**

### File: `src/core/runner.ts`

### Locations where `state.currentAgentSpan.end()` is called:

1. **Line 156-160:** Error case (OK - no tokens to report)
2. **Line 184:** Switching agents (NEEDS FIX)
3. **Line 319-321:** Final output (NEEDS FIX) ⚠️ **MOST IMPORTANT**
4. **Line 373-378:** Transfer case (NEEDS FIX) ⚠️ **IMPORTANT**
5. **Line 438-441:** Error in loop (OK - no tokens to report)

---

## 🔧 **SOLUTION:**

### Need to track tokens per agent:

We already have this! `state.agentMetrics` tracks per-agent tokens:

```typescript
// From src/core/runstate.ts lines 191-210
state.agentMetrics.get(agentName) = {
  agentName: "Knowledge",
  turns: 3,
  tokens: {
    input: 7889,
    output: 756,
    total: 8645
  }
}
```

### Fix: Pass agent's accumulated tokens when ending span

**Before:**
```typescript
state.currentAgentSpan.end({
  output: finalOutput
});
```

**After:**
```typescript
const agentMetrics = state.agentMetrics.get(state.currentAgent.name);
state.currentAgentSpan.end({
  output: finalOutput,
  usage: agentMetrics ? {
    input: agentMetrics.tokens.input,
    output: agentMetrics.tokens.output,
    total: agentMetrics.tokens.total
  } : undefined
});
```

---

## 📝 **EXECUTION PLAN:**

### Step 1: Update agent span ending - Final Output (Line ~319)
**Impact:** Shows tokens when agent completes successfully
**Priority:** 🔴 **CRITICAL**

### Step 2: Update agent span ending - Transfer (Line ~373)
**Impact:** Shows tokens when agent transfers to another agent  
**Priority:** 🟡 **HIGH**

### Step 3: Update agent span ending - Agent Switch (Line ~184)
**Impact:** Shows tokens when switching between agents
**Priority:** 🟢 **MEDIUM**

### Step 4: Test with E2E test
**Verify:** All agent spans show accumulated token usage

---

## ✅ **EXPECTED RESULT AFTER FIX:**

```json
"Agent: Triage": {
    "type": "SPAN",
    "inputUsage": 580,      // ← From generation
    "outputUsage": 87,       // ← From generation
    "totalUsage": 667,       // ← From generation
    "totalCost": 0.00232     // ← Calculated by Langfuse
}

"Agent: Knowledge": {
    "type": "SPAN",
    "inputUsage": 7889,      // ← Sum of all 3 generations
    "outputUsage": 756,      // ← Sum of all 3 generations
    "totalUsage": 8645,      // ← Sum of all 3 generations
    "totalCost": 0.00165     // ← Calculated by Langfuse
}
```

### Tools and Guardrails will still show 0 (CORRECT!)
- Tools don't make LLM calls → no tokens
- Guardrails don't make LLM calls → no tokens
- Only GENERATIONS and their parent AGENTS should show tokens

---

## 🚀 **READY TO EXECUTE?**

The plan is clear:
1. Get agent metrics from `state.agentMetrics.get(agentName)`
2. Pass `usage` parameter when calling `span.end()`
3. Update 3 locations in `runner.ts`
4. Test and verify

**Proceed?** ✅

