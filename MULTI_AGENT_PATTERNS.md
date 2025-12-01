# Multi-Agent Coordination Patterns

This document explains the two multi-agent coordination patterns supported by the `tawk-agents-sdk`, demonstrating different approaches to orchestrating multiple specialist agents.

---

## 🎯 Pattern Overview

The SDK supports **TWO** primary multi-agent coordination patterns:

| Pattern | Execution | Use Case | Agentic Level |
|---------|-----------|----------|---------------|
| **Agents-as-Tools** | Parallel ⚡ | Complex multi-intent queries | ✅✅✅ Maximum |
| **Agent Handoffs** | Sequential → | Clear routing, specialization | ✅✅ High |

---

## Pattern 1: Agents-as-Tools (Parallel Coordination)

### 🚀 **The Most Agentic Pattern**

This pattern allows a coordinator agent to call **multiple specialist agents as tools in PARALLEL** and synthesize their results into a single response.

### How It Works

```typescript
// 1. Define specialist agents
const knowledgeAgent = new Agent({
  name: 'Knowledge',
  instructions: 'You are a knowledge specialist...',
  tools: { searchKnowledgeBase: pineconeSearchTool },
});

const actionAgent = new Agent({
  name: 'Action',
  instructions: 'You are an action specialist...',
  tools: { checkSystemStatus, getAccountInfo },
});

const escalationAgent = new Agent({
  name: 'Escalation',
  instructions: 'You are an escalation specialist...',
  tools: { createEscalation },
});

// 2. Create coordinator with agents-as-tools
const coordinatorAgent = new Agent({
  name: 'Coordinator',
  instructions: `You coordinate multiple specialist agents.
  
  Call ALL relevant agents in parallel for multi-intent queries.
  Synthesize their results into a comprehensive response.`,
  tools: {
    agent_knowledge: knowledgeAgent.asTool({
      toolName: 'agent_knowledge',
      toolDescription: 'Call Knowledge Agent for documentation/info queries',
    }),
    agent_action: actionAgent.asTool({
      toolName: 'agent_action',
      toolDescription: 'Call Action Agent for operational tasks',
    }),
    agent_escalation: escalationAgent.asTool({
      toolName: 'agent_escalation',
      toolDescription: 'Call Escalation Agent for human handoff',
    }),
  },
});

// 3. Run coordinator with multi-intent query
const result = await run(coordinatorAgent, 
  `I have 3 questions:
   1. Tell me about Alan Turing's work (Knowledge)
   2. Check my account status (Action)
   3. I have a billing dispute (Escalation)`
);
```

### Execution Flow

```
User Query (multi-intent)
    ↓
Coordinator Agent analyzes
    ↓ (makes 3 tool calls in ONE turn)
    ├─→ agent_knowledge()  ⚡
    ├─→ agent_action()     ⚡  ALL EXECUTE IN PARALLEL
    └─→ agent_escalation() ⚡
    ↓ (all results returned)
Coordinator synthesizes results
    ↓
Single comprehensive response
```

### Key Features

✅ **True Parallel Execution**
- All agents execute simultaneously via `Promise.all()`
- Faster than sequential processing
- Optimal resource utilization

✅ **Autonomous Coordination**
- Coordinator **decides** which agents to call
- Can call 1, 2, or all 3 based on query analysis
- Model-driven decision making

✅ **Result Aggregation**
- Single, comprehensive response
- Synthesizes multiple perspectives
- Better user experience

✅ **Flexible & Scalable**
- Easy to add more specialist agents
- Adapts to query complexity
- Production-ready pattern

### When to Use

- ✅ Complex queries with multiple intents
- ✅ Need comprehensive responses from multiple sources
- ✅ Want maximum parallelization
- ✅ Single coordinated response preferred
- ✅ Cost and latency optimization

### Example Use Cases

1. **Multi-Domain Customer Support**
   - Query: "Check my account, search docs, and escalate billing issue"
   - Coordinator calls all 3 agents in parallel
   - Returns unified response

2. **Research Synthesis**
   - Query: "Research topic X from multiple sources"
   - Coordinator calls multiple research agents
   - Synthesizes comprehensive report

3. **Enterprise Workflows**
   - Query: "Execute workflow steps A, B, and C"
   - Coordinator orchestrates specialist agents
   - Aggregates results

---

## Pattern 2: Agent Handoffs (Sequential Routing)

### 🔄 **Clear Specialization Pattern**

This pattern uses a triage agent to route queries to **one specialist agent at a time**, creating a clear chain of responsibility.

### How It Works

```typescript
// 1. Define specialist agents (same as above)
const knowledgeAgent = new Agent({ ... });
const actionAgent = new Agent({ ... });
const escalationAgent = new Agent({ ... });

// 2. Create triage agent with handoffs
const triageAgent = new Agent({
  name: 'Triage',
  instructions: `You route queries to specialist agents.
  
  Analyze the query and handoff to ONE specialist:
  - Knowledge Agent for documentation
  - Action Agent for operations
  - Escalation Agent for complex issues`,
  handoffs: [knowledgeAgent, actionAgent, escalationAgent],
});

// 3. Run separate queries for each specialist
const query1 = 'What is Alan Turing known for?';
const query2 = 'Check my account status';
const query3 = 'I have a billing dispute';

const result1 = await run(triageAgent, query1);  // → Knowledge
const result2 = await run(triageAgent, query2);  // → Action
const result3 = await run(triageAgent, query3);  // → Escalation
```

### Execution Flow

```
Query 1: "What is Alan Turing known for?"
    ↓
Triage Agent analyzes
    ↓ (handoff decision)
Knowledge Agent
    ↓
Specialized response

Query 2: "Check my account status"
    ↓
Triage Agent analyzes
    ↓ (handoff decision)
Action Agent
    ↓
Specialized response

Query 3: "I have a billing dispute"
    ↓
Triage Agent analyzes
    ↓ (handoff decision)
Escalation Agent
    ↓
Specialized response
```

### Key Features

✅ **Clear Agent Specialization**
- Each query routed to ONE specialist
- Clear responsibility boundaries
- Easy to understand flow

✅ **Sequential Processing**
- One agent at a time
- Predictable execution path
- Simple debugging

✅ **Confidence-Based Routing**
- Triage assigns confidence scores
- Routes to most appropriate specialist
- Fallback to escalation if unsure

✅ **Individual Validation**
- Test each specialist independently
- Verify agent capabilities
- Production-ready routing

### When to Use

- ✅ Single-intent queries
- ✅ Clear routing requirements
- ✅ Need individual agent validation
- ✅ Sequential processing acceptable
- ✅ Simple, predictable flows

### Example Use Cases

1. **Customer Support Routing**
   - Each ticket routed to ONE specialist
   - Clear escalation path
   - Track agent performance

2. **Task Distribution**
   - Different query types → different agents
   - Maintain specialization
   - Sequential processing

3. **Testing & Validation**
   - Validate each agent independently
   - Test routing logic
   - Measure individual performance

---

## 📊 Pattern Comparison

### Performance

| Metric | Agents-as-Tools | Handoffs |
|--------|-----------------|----------|
| **Execution** | Parallel | Sequential |
| **Latency** | Lower (parallel) | Higher (sequential) |
| **Throughput** | Higher | Lower |
| **Complexity** | Higher | Lower |

### Agentic Characteristics

| Feature | Agents-as-Tools | Handoffs |
|---------|-----------------|----------|
| **Autonomous Coordination** | ✅ Maximum | ✅ High |
| **Parallel Execution** | ✅ Yes | ❌ No |
| **Result Aggregation** | ✅ Yes | ❌ No |
| **Dynamic Tool Selection** | ✅ Yes | ✅ Yes |
| **Multi-Intent Handling** | ✅ Excellent | ⚠️ Limited |

### Use Case Fit

| Scenario | Best Pattern |
|----------|--------------|
| Multi-intent query | Agents-as-Tools ✅ |
| Single-intent query | Handoffs ✅ |
| Need synthesis | Agents-as-Tools ✅ |
| Clear routing | Handoffs ✅ |
| Maximum parallelization | Agents-as-Tools ✅ |
| Simple debugging | Handoffs ✅ |
| Cost optimization | Agents-as-Tools ✅ |
| Individual validation | Handoffs ✅ |

---

## 🧪 Testing Examples

Both patterns are demonstrated in `tests/e2e/12-agentic-rag-with-pinecone.spec.ts`:

### Test Scenario 9: Agents-as-Tools

```bash
npx tsx tests/e2e/12-agentic-rag-with-pinecone.spec.ts
```

Expected output:
```
🧪 SCENARIO 9: TRUE AGENTIC COORDINATION
   ✅ Knowledge Agent - CALLED
   ✅ Action Agent - CALLED
   ✅ Escalation Agent - CALLED
   
   Coordination Pattern: Agents-as-Tools (Parallel Execution)
   Agents Orchestrated: 3/3
   Execution: PARALLEL ⚡
   Synthesis: Multi-Agent Aggregation ✅

🎉 SUCCESS: TRUE AGENTIC COORDINATION VALIDATED!
```

### Test Scenario 10: Sequential Handoffs

Expected output:
```
🧪 SCENARIO 10: Sequential Multi-Agent Workflow
📝 Step 1: Knowledge query... ✓ Triage → Knowledge
📝 Step 2: Action query... ✓ Triage → Action
📝 Step 3: Escalation query... ✓ Triage → Escalation

Agents Triggered:
   ✅ Knowledge Agent - RAG with Pinecone
   ✅ Action Agent - Operational tasks
   ✅ Escalation Agent - Human handoff

🎉 SUCCESS: All 4 agents validated!
```

---

## 🎯 Recommendations

### Use **Agents-as-Tools** when you need:
- ⚡ Maximum parallelization
- 🧠 Complex multi-intent queries
- 🎯 Single comprehensive response
- 💰 Cost and latency optimization
- 🚀 Most agentic behavior

### Use **Handoffs** when you need:
- 🔄 Clear agent specialization
- 📊 Individual agent validation
- 🎓 Simple, predictable flows
- 🐛 Easy debugging
- 📝 Sequential processing

### Hybrid Approach
You can **combine both patterns**:
```typescript
// Coordinator can use both handoffs AND agent-tools
const hybridAgent = new Agent({
  name: 'Hybrid',
  instructions: 'Use handoffs for simple queries, agents-as-tools for complex ones',
  tools: {
    agent_knowledge: knowledgeAgent.asTool(),
    // ... other agent tools
  },
  handoffs: [escalationAgent], // Fallback handoff
});
```

---

## 📚 SDK Features Used

Both patterns leverage core SDK capabilities:

| Feature | Agents-as-Tools | Handoffs |
|---------|-----------------|----------|
| `Agent.asTool()` | ✅ Core | ❌ Not used |
| `executeToolsInParallel()` | ✅ Yes | ✅ Yes (for agent's own tools) |
| `Agent.handoffs` | ❌ Not used | ✅ Core |
| `determineNextStep()` | ✅ Yes | ✅ Yes |
| Langfuse Tracing | ✅ Full | ✅ Full |
| `Promise.all()` | ✅ Parallel agents | ✅ Parallel tools |

---

## 🎉 Conclusion

The `tawk-agents-sdk` provides **TWO powerful patterns** for multi-agent coordination:

1. **Agents-as-Tools**: The **most agentic pattern**, perfect for complex multi-intent queries requiring parallel execution and result synthesis.

2. **Agent Handoffs**: A **clear, specialized pattern**, ideal for routing single-intent queries to the right specialist agent.

**Both patterns are production-ready, fully traced, and validated.** Choose based on your use case, or combine them for maximum flexibility!

---

**Status**: ✅ Production Ready | 🚀 Fully Agentic | 📊 Validated in Tests

