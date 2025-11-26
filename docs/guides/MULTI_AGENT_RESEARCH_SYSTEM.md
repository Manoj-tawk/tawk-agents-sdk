# Building a Multi-Agent Research System with Tawk Agents SDK

**Based on Anthropic's Multi-Agent Research System Architecture**

This guide explains how to build a production-ready multi-agent research system similar to Anthropic's Research feature using the Tawk Agents SDK.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Implementation Guide](#implementation-guide)
4. [Key Patterns](#key-patterns)
5. [Production Considerations](#production-considerations)
6. [Complete Example](#complete-example)

---

## Architecture Overview

### Anthropic's Architecture (Reference)

Anthropic's Research system uses:
- **LeadResearcher Agent**: Orchestrates the research process
- **Subagents**: Specialized agents that search in parallel
- **CitationAgent**: Processes and adds citations to final output
- **Memory System**: Persists research plans when context exceeds limits
- **Parallel Execution**: Subagents work simultaneously

### Our SDK Architecture

The Tawk Agents SDK provides all necessary building blocks:

```
┌─────────────────────────────────────────────────────────────┐
│                    Lead Researcher Agent                     │
│  - Plans research strategy                                   │
│  - Creates subagents via tools                              │
│  - Synthesizes results                                      │
│  - Manages memory/context                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Uses create_subagent tool
                   │
        ┌──────────┴──────────┬──────────────┬──────────────┐
        │                      │              │              │
   ┌────▼────┐          ┌─────▼─────┐  ┌─────▼─────┐  ┌──▼────┐
   │Subagent │          │ Subagent  │  │ Subagent  │  │ ...   │
   │   #1    │          │    #2     │  │    #3     │  │       │
   │         │          │           │  │           │  │       │
   │ Web     │          │ Academic  │  │ Industry  │  │       │
   │ Search  │          │ Sources   │  │ Reports   │  │       │
   └────┬────┘          └─────┬─────┘  └─────┬─────┘  └───────┘
        │                      │              │
        └─────────────────────┴──────────────┘
                   │
                   │ Returns findings
                   │
        ┌──────────▼──────────────────────────┐
        │      Lead Researcher                │
        │  - Synthesizes all findings          │
        │  - Decides if more research needed   │
        └──────────┬───────────────────────────┘
                   │
                   │ Final synthesis
                   │
        ┌──────────▼──────────────────────────┐
        │      Citation Agent                  │
        │  - Processes documents              │
        │  - Adds citations                    │
        └──────────────────────────────────────┘
```

---

## Core Components

### 1. Agent Creation & Management

**SDK Capability**: `Agent` class with `asTool()` method

```typescript
import { Agent, run, tool } from '@tawk/agents-sdk';
import { z } from 'zod';
```

**Key Features**:
- ✅ Agents can be converted to tools (`agent.asTool()`)
- ✅ Agents can have handoffs (`handoffs` property)
- ✅ Dynamic instructions (function-based)
- ✅ Unlimited instructions length
- ✅ Context injection via `RunContextWrapper`

### 2. Parallel Execution

**SDK Capability**: `raceAgents()` function + `Promise.all()`

```typescript
import { raceAgents } from '@tawk/agents-sdk';
```

**Key Features**:
- ✅ Execute multiple agents in parallel
- ✅ Race pattern (first to complete wins)
- ✅ Parallel pattern (all complete, collect results)
- ✅ Timeout support

### 3. Memory & Persistence

**SDK Capability**: `Session` system + `MemorySession`, `RedisSession`, `DatabaseSession`

```typescript
import { MemorySession, RedisSession, SessionManager } from '@tawk/agents-sdk';
```

**Key Features**:
- ✅ In-memory sessions (development)
- ✅ Redis sessions (production, fast)
- ✅ Database sessions (durable)
- ✅ Hybrid sessions (Redis + DB)
- ✅ Automatic summarization for long conversations
- ✅ Metadata storage

### 4. Tool System

**SDK Capability**: `tool()` helper + tool definitions

```typescript
import { tool } from '@tawk/agents-sdk';
```

**Key Features**:
- ✅ Dynamic tool creation
- ✅ Context injection in tools
- ✅ Tool enabling/disabling based on context
- ✅ Zod schema validation
- ✅ Tools can spawn agents (via `asTool()`)

### 5. Context Management

**SDK Capability**: `RunContextWrapper` + `RunOptions.context`

**Key Features**:
- ✅ Request-scoped context
- ✅ Shared context across agents
- ✅ Context passed to tools automatically
- ✅ Type-safe context

---

## Implementation Guide

### Step 1: Create Subagent Template

Subagents are specialized research agents that can be spawned dynamically.

```typescript
import { Agent, tool } from '@tawk/agents-sdk';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Subagent template - can be cloned for different research tasks
const createSubagent = (task: string, focus: string) => {
  return new Agent({
    name: `Subagent-${Date.now()}`,
    model: openai('gpt-4o-mini'), // Use smaller model for subagents
    instructions: `You are a specialized research subagent focused on: ${focus}
    
Your specific task: ${task}

Guidelines:
- Perform thorough web searches
- Evaluate source quality
- Return structured findings
- Be concise but comprehensive
- Focus on your assigned aspect of the research`,
    tools: {
      web_search: tool({
        description: 'Search the web for information',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
          maxResults: z.number().optional().describe('Maximum results to return'),
        }),
        execute: async ({ query, maxResults = 10 }) => {
          // Implement web search (e.g., using Serper, Tavily, or custom API)
          const results = await performWebSearch(query, maxResults);
          return {
            query,
            results: results.map(r => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              relevance: r.relevance,
            })),
          };
        },
      }),
      
      evaluate_source: tool({
        description: 'Evaluate the quality and reliability of a source',
        inputSchema: z.object({
          url: z.string(),
          content: z.string(),
        }),
        execute: async ({ url, content }) => {
          // Implement source quality evaluation
          const quality = evaluateSourceQuality(url, content);
          return {
            url,
            quality: quality.score,
            reasoning: quality.reasoning,
            isAuthoritative: quality.isAuthoritative,
          };
        },
      }),
    },
    maxSteps: 15, // Allow multiple search iterations
  });
};
```

### Step 2: Create Lead Researcher Agent

The lead agent orchestrates the research process.

```typescript
import { Agent, tool, run } from '@tawk/agents-sdk';
import { z } from 'zod';

interface ResearchContext {
  researchPlan?: string;
  subagentResults: Array<{
    subagentId: string;
    findings: any;
    focus: string;
  }>;
  memory: Map<string, any>;
}

const leadResearcher = new Agent<ResearchContext>({
  name: 'LeadResearcher',
  model: openai('gpt-4o'), // Use stronger model for coordination
  instructions: `You are a lead research agent that coordinates multi-agent research.

Your responsibilities:
1. Analyze the user's research query
2. Create a research plan and save it to memory
3. Decompose the query into specialized sub-tasks
4. Create subagents to research different aspects in parallel
5. Synthesize findings from all subagents
6. Decide if additional research is needed
7. Compile final research report

Guidelines:
- Scale effort to query complexity:
  * Simple: 1-2 subagents, 3-5 tool calls each
  * Medium: 3-5 subagents, 10-15 tool calls each
  * Complex: 5-10 subagents, 15-20 tool calls each
- Give subagents clear, specific tasks
- Avoid duplicate work between subagents
- Synthesize results comprehensively`,
  
  tools: {
    // Save research plan to memory
    save_research_plan: tool({
      description: 'Save research plan to memory for context persistence',
      inputSchema: z.object({
        plan: z.string().describe('The research plan to save'),
      }),
      execute: async ({ plan }, context) => {
        context.context.researchPlan = plan;
        context.context.memory.set('researchPlan', plan);
        return { saved: true, planLength: plan.length };
      },
    }),
    
    // Create and run subagent
    create_subagent: tool({
      description: 'Create a specialized subagent to research a specific aspect',
      inputSchema: z.object({
        task: z.string().describe('Specific research task for this subagent'),
        focus: z.string().describe('Focus area (e.g., "academic sources", "industry reports", "news articles")'),
      }),
      execute: async ({ task, focus }, context) => {
        // Create subagent
        const subagent = createSubagent(task, focus);
        const subagentId = subagent.name;
        
        // Run subagent with its task
        const result = await run(subagent, `Research the following: ${task}`, {
          context: context.context,
          maxTurns: 20, // Allow sufficient turns for research
        });
        
        // Store results
        context.context.subagentResults.push({
          subagentId,
          findings: result.finalOutput,
          focus,
        });
        
        return {
          subagentId,
          status: 'completed',
          findings: result.finalOutput,
          toolCalls: result.metadata.totalToolCalls,
          tokens: result.metadata.totalTokens,
        };
      },
    }),
    
    // Retrieve research plan from memory
    get_research_plan: tool({
      description: 'Retrieve saved research plan from memory',
      inputSchema: z.object({}),
      execute: async (_, context) => {
        const plan = context.context.memory.get('researchPlan') || context.context.researchPlan;
        return { plan: plan || 'No plan saved yet' };
      },
    }),
    
    // Synthesize findings
    synthesize_findings: tool({
      description: 'Synthesize findings from all subagents into a comprehensive report',
      inputSchema: z.object({
        includeCitations: z.boolean().optional().describe('Whether to include citations'),
      }),
      execute: async ({ includeCitations = true }, context) => {
        const allFindings = context.context.subagentResults.map(r => ({
          focus: r.focus,
          findings: r.findings,
        }));
        
        return {
          synthesized: true,
          findings: allFindings,
          totalSubagents: context.context.subagentResults.length,
          includeCitations,
        };
      },
    }),
  },
  
  maxSteps: 30, // Allow many steps for coordination
});
```

### Step 3: Create Citation Agent

Processes documents and adds citations.

```typescript
const citationAgent = new Agent({
  name: 'CitationAgent',
  model: openai('gpt-4o'),
  instructions: `You are a citation agent that processes research documents and adds proper citations.

Your task:
1. Review the research report
2. Identify all claims that need citations
3. Match claims to their sources
4. Add proper citations in the requested format
5. Ensure all sources are properly attributed

Citation format: [Source Title](URL) or (Author, Year)`,
  
  tools: {
    process_documents: tool({
      description: 'Process research documents and extract citation information',
      inputSchema: z.object({
        documents: z.array(z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
        })),
      }),
      execute: async ({ documents }) => {
        // Extract citation metadata
        return {
          citations: documents.map(doc => ({
            title: doc.title,
            url: doc.url,
            citationKey: generateCitationKey(doc),
          })),
        };
      },
    }),
  },
});
```

### Step 4: Implement Parallel Subagent Execution

Use `Promise.all()` to run subagents in parallel.

```typescript
async function runParallelSubagents(
  tasks: Array<{ task: string; focus: string }>,
  context: ResearchContext
): Promise<Array<any>> {
  // Create all subagents
  const subagents = tasks.map(({ task, focus }) => 
    createSubagent(task, focus)
  );
  
  // Run all subagents in parallel
  const results = await Promise.all(
    subagents.map((subagent, index) => 
      run(subagent, `Research: ${tasks[index].task}`, {
        context: context as any,
        maxTurns: 20,
      })
    )
  );
  
  return results.map((result, index) => ({
    subagentId: subagents[index].name,
    focus: tasks[index].focus,
    findings: result.finalOutput,
    metadata: result.metadata,
  }));
}
```

### Step 5: Complete Research System

Combine all components into a complete system.

```typescript
interface ResearchSystemConfig {
  useParallelSubagents?: boolean;
  maxSubagents?: number;
  citationFormat?: 'apa' | 'mla' | 'chicago';
}

async function runResearchSystem(
  query: string,
  config: ResearchSystemConfig = {}
): Promise<{
  finalReport: string;
  citations: Array<{ title: string; url: string }>;
  metadata: {
    subagentsUsed: number;
    totalTokens: number;
    totalToolCalls: number;
  };
}> {
  // Initialize context
  const context: ResearchContext = {
    subagentResults: [],
    memory: new Map(),
  };
  
  // Step 1: Lead researcher creates plan and spawns subagents
  const leadResult = await run(leadResearcher, query, {
    context: context as any,
    maxTurns: 50,
  });
  
  // Step 2: If parallel execution is enabled, run subagents in parallel
  if (config.useParallelSubagents && context.subagentResults.length > 0) {
    // Subagents were already created via tools, results are in context
    // This is handled by the create_subagent tool
  }
  
  // Step 3: Synthesize findings
  const synthesis = await run(leadResearcher, 
    'Synthesize all findings into a comprehensive research report with proper structure.',
    {
      context: context as any,
      maxTurns: 10,
    }
  );
  
  // Step 4: Add citations
  const citationResult = await run(citationAgent, 
    `Add citations to this research report:\n\n${synthesis.finalOutput}`,
    {
      context: context as any,
      maxTurns: 10,
    }
  );
  
  return {
    finalReport: citationResult.finalOutput,
    citations: extractCitations(citationResult.finalOutput),
    metadata: {
      subagentsUsed: context.subagentResults.length,
      totalTokens: leadResult.metadata.totalTokens! + 
                   synthesis.metadata.totalTokens! + 
                   citationResult.metadata.totalTokens!,
      totalToolCalls: leadResult.metadata.totalToolCalls! + 
                      synthesis.metadata.totalToolCalls! + 
                      citationResult.metadata.totalToolCalls!,
    },
  };
}
```

---

## Key Patterns

### Pattern 1: Agent as Tool

Use `agent.asTool()` to enable agents to spawn other agents.

```typescript
const subagentTemplate = new Agent({
  name: 'SubagentTemplate',
  // ... config
});

const leadAgent = new Agent({
  name: 'LeadAgent',
  tools: {
    research: subagentTemplate.asTool({
      toolDescription: 'Delegate research to a specialized subagent',
    }),
  },
});
```

### Pattern 2: Dynamic Agent Creation

Create agents dynamically based on task requirements.

```typescript
function createSpecializedAgent(task: string, domain: string): Agent {
  return new Agent({
    name: `Agent-${domain}-${Date.now()}`,
    instructions: `You specialize in ${domain}. Task: ${task}`,
    // ... tools specific to domain
  });
}
```

### Pattern 3: Memory Persistence

Use sessions to persist research plans and context.

```typescript
import { RedisSession } from '@tawk/agents-sdk';

const session = new RedisSession('research-session-123', {
  redis: redisClient,
  maxMessages: 200, // Store up to 200 messages
});

// Save research plan to session metadata
await session.updateMetadata({
  researchPlan: '...',
  subagents: [...],
});

// Retrieve later
const metadata = await session.getMetadata();
const plan = metadata.researchPlan;
```

### Pattern 4: Context Sharing

Share context across agents using `RunOptions.context`.

```typescript
interface SharedContext {
  researchPlan: string;
  findings: Array<any>;
  memory: Map<string, any>;
}

const sharedContext: SharedContext = {
  researchPlan: '',
  findings: [],
  memory: new Map(),
};

// All agents share the same context
await run(agent1, query, { context: sharedContext });
await run(agent2, query, { context: sharedContext });
```

### Pattern 5: Parallel Execution with Race

Use `raceAgents()` for fallback patterns or `Promise.all()` for parallel collection.

```typescript
// Race pattern (first to complete wins)
const result = await raceAgents(
  [fastAgent, thoroughAgent],
  query,
  { timeoutMs: 30000 }
);

// Parallel pattern (collect all results)
const results = await Promise.all([
  run(agent1, query),
  run(agent2, query),
  run(agent3, query),
]);
```

---

## Production Considerations

### 1. Error Handling & Resilience

```typescript
async function runSubagentWithRetry(
  subagent: Agent,
  task: string,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await run(subagent, task, { maxTurns: 20 });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`Subagent failed, retrying (${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### 2. Token Budget Management

```typescript
interface TokenBudget {
  maxTokens: number;
  usedTokens: number;
}

function checkTokenBudget(budget: TokenBudget, additional: number): boolean {
  return budget.usedTokens + additional <= budget.maxTokens;
}

// Use in tool execution
const create_subagent = tool({
  // ...
  execute: async ({ task, focus }, context) => {
    const budget = context.context.tokenBudget;
    const estimatedTokens = 5000; // Estimate for subagent
    
    if (!checkTokenBudget(budget, estimatedTokens)) {
      return { error: 'Token budget exceeded' };
    }
    
    // ... create and run subagent
    budget.usedTokens += result.metadata.totalTokens!;
    return result;
  },
});
```

### 3. Context Window Management

Use session summarization for long conversations.

```typescript
import { MemorySession } from '@tawk/agents-sdk';

const session = new MemorySession('research-123', 100, {
  // Auto-summarize when approaching limit
  maxMessages: 100,
  summarization: {
    enabled: true,
    triggerAt: 80, // Summarize when 80 messages reached
    preserveRecent: 20, // Keep last 20 messages
  },
});
```

### 4. Observability & Tracing

```typescript
import { initializeLangfuse, createTrace } from '@tawk/agents-sdk';

// Initialize tracing
initializeLangfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

// Create trace for research session
const trace = createTrace({
  name: 'Research Session',
  metadata: {
    query: userQuery,
    subagents: [],
  },
});

// Agents automatically create spans under the trace
```

### 5. Deployment Strategy

Use rainbow deployments to avoid disrupting running agents.

```typescript
// Version agents
const leadResearcherV1 = new Agent({ name: 'LeadResearcher-v1', ... });
const leadResearcherV2 = new Agent({ name: 'LeadResearcher-v2', ... });

// Gradual rollout
const useV2 = Math.random() < 0.1; // 10% traffic to v2
const agent = useV2 ? leadResearcherV2 : leadResearcherV1;
```

---

## Complete Example

See `examples/advanced/multi-agent-research.ts` for a complete, production-ready implementation.

---

## Summary

### SDK Capabilities Mapping

| Anthropic Feature | SDK Equivalent | Status |
|------------------|----------------|--------|
| Lead Agent | `Agent` class | ✅ |
| Subagents | `Agent.asTool()` + dynamic creation | ✅ |
| Parallel Execution | `Promise.all()` + `raceAgents()` | ✅ |
| Memory/Persistence | `Session` system | ✅ |
| Context Management | `RunContextWrapper` | ✅ |
| Tool System | `tool()` helper | ✅ |
| Citation Processing | Separate `Agent` | ✅ |
| Error Handling | Try/catch + retries | ✅ |
| Observability | Langfuse integration | ✅ |

### Key Advantages

1. **Unlimited Instructions**: No character limits like previous systems
2. **Dynamic Agent Creation**: Create subagents on-demand
3. **Parallel Execution**: Built-in support via `Promise.all()` and `raceAgents()`
4. **Memory System**: Sessions with Redis/DB support
5. **Context Sharing**: Type-safe context injection
6. **Tool System**: Flexible tool creation and execution
7. **Multi-Provider**: Support for OpenAI, Anthropic, Google, etc.
8. **Production Ready**: Error handling, tracing, sessions

### Next Steps

1. Implement web search tool (Serper, Tavily, or custom)
2. Add source quality evaluation
3. Implement citation extraction
4. Add token budget management
5. Set up observability (Langfuse)
6. Test with various query complexities
7. Optimize prompts based on Anthropic's principles
8. Deploy with rainbow deployment strategy

---

## References

- [Anthropic Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [SDK Documentation](../reference/API.md)
- [Architecture Guide](../reference/ARCHITECTURE.md)
- [Examples](../../examples/)

