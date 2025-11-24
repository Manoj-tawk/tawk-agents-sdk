# 🚀 Agentic RAG with Multi-Agent Workflow

## Overview

This guide demonstrates how to build a production-ready **Agentic RAG (Retrieval-Augmented Generation)** system using Tawk Agents SDK with pure agent orchestration. All routing, coordination, and workflow management happens through SDK handoffs - no hardcoded logic.

## Architecture

### Pure Agent Handoffs Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Query Router Agent                        │
│  - Analyzes query intent                                    │
│  - Routes via SDK handoffs                                  │
│  - Uses logRouting tool for visibility                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Technical    │ │  General     │ │  Domain      │
│  Retrieval    │ │  Retrieval   │ │  Retrieval   │
│  Agent        │ │  Agent       │ │  Agent       │
└──────┬────────┘ └──────┬───────┘ └──────┬───────┘
       │                  │                 │
       └──────────────────┼─────────────────┘
                          │
                          ▼
              ┌──────────────────┐
              │  Synthesis Agent  │
              │  - Re-ranks docs  │
              │  - Combines ctx   │
              └────────┬──────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Response Agent  │
              │  - Final answer  │
              │  - Citations     │
              └──────────────────┘
```

**Key Principle**: All orchestration happens through SDK handoffs. The router agent decides which retrieval agents to use, and each agent hands off to the next in the chain automatically.

## Implementation

### 1. Knowledge Base Setup

```typescript
interface Document {
  id: string;
  text: string;
  domain: 'technical' | 'general' | 'domain';
  embedding?: number[];
}

const knowledgeBase: Document[] = [
  { id: 'tech-1', domain: 'technical', text: 'TypeScript is a typed superset...' },
  { id: 'gen-1', domain: 'general', text: 'JavaScript is a programming language...' },
  { id: 'dom-1', domain: 'domain', text: 'Tawk Agents SDK provides...' },
];
```

### 2. Vector Store

```typescript
import { cosineSimilarity } from '@tawk-agents-sdk/core';

class VectorStore {
  private documents: Map<string, Document[]>;

  async search(
    queryEmbedding: number[],
    domain: string,
    topK: number = 5
  ): Promise<Array<{ doc: Document; score: number }>> {
    const domainDocs = this.documents.get(domain) || [];
    
    return domainDocs
      .filter(doc => doc.embedding)
      .map(doc => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
```

### 3. Agent Definitions

#### Query Router Agent

```typescript
import { Agent, tool } from '@tawk-agents-sdk/core';
import { z } from 'zod';

const routerAgent = new Agent({
  name: 'QueryRouter',
  instructions: `You are a query router that classifies queries and routes them to appropriate specialist agents using handoffs.

Your job:
1. Analyze the incoming query
2. Use logRouting tool to record your routing decision (for visibility)
3. Hand off to the appropriate specialist agent(s) using SDK handoffs

Classification rules:
- Technical queries → Hand off to Technical Retrieval Agent
- General knowledge queries → Hand off to General Knowledge Agent
- Domain-specific queries → Hand off to Domain Retrieval Agent
- Multi-domain queries → Hand off to multiple agents

IMPORTANT: Always use handoffs to route queries. Do not try to answer queries yourself.`,
  tools: {
    logRouting: tool({
      description: 'Log routing decision for visibility and debugging',
      parameters: z.object({
        decision: z.string().describe('Routing decision explanation'),
        agents: z.array(z.string()).describe('Agent names being routed to'),
      }),
      execute: async ({ decision, agents }) => {
        console.log(`🎯 Router Decision: ${decision}`);
        console.log(`📍 Routing to: ${agents.join(', ')}`);
        return { logged: true, decision, agents };
      },
    }),
  },
  handoffs: [technicalRetrievalAgent, generalRetrievalAgent, domainRetrievalAgent],
});
```

#### Retrieval Agents

```typescript
import { generateEmbeddingAI } from '@tawk-agents-sdk/core';
import { openai } from '@ai-sdk/openai';

const technicalRetrievalAgent = new Agent({
  name: 'TechnicalRetrieval',
  instructions: `You are a technical documentation retrieval specialist.

When given a query:
1. Use searchKnowledgeBase tool to find relevant technical documents
2. After retrieving documents, hand off to Synthesis Agent
3. Include document IDs in your response

Always hand off to Synthesis Agent after retrieval.`,
  tools: {
    searchKnowledgeBase: tool({
      description: 'Search technical knowledge base using semantic similarity',
      parameters: z.object({
        query: z.string().describe('Search query'),
        topK: z.number().default(5).describe('Number of results'),
      }),
      execute: async ({ query, topK }) => {
        const embeddingModel = openai.embedding('text-embedding-3-small');
        const queryEmbed = await generateEmbeddingAI({
          model: embeddingModel,
          value: query,
        });

        const results = await vectorStore.search(
          queryEmbed.embedding,
          'technical',
          topK
        );

        return {
          documents: results.map(r => ({
            id: r.doc.id,
            text: r.doc.text,
            score: r.score,
          })),
          context: results.map(r => r.doc.text).join('\n\n'),
          documentIds: results.map(r => r.doc.id),
        };
      },
    }),
  },
  handoffDescription: 'Handles technical queries about code, frameworks, and APIs',
});
```

#### Synthesis Agent

```typescript
const synthesisAgent = new Agent({
  name: 'Synthesis',
  instructions: `You are a synthesis agent that combines information from multiple sources.

Your job:
1. Receive contexts from retrieval agents
2. Re-rank documents by relevance
3. Remove duplicates and consolidate
4. Hand off to Response Agent after synthesis`,
  tools: {
    rerankDocuments: tool({
      description: 'Re-rank documents by relevance to the query',
      parameters: z.object({
        query: z.string(),
        documents: z.array(z.object({
          id: z.string(),
          text: z.string(),
          score: z.number().optional(),
        })),
      }),
      execute: async ({ query, documents }) => {
        // Re-rank by score (or use AI SDK v6 reranking)
        const sorted = [...documents].sort((a, b) => (b.score || 0) - (a.score || 0));
        return {
          reranked: sorted,
          context: sorted.map(d => d.text).join('\n\n'),
          documentIds: sorted.map(d => d.id),
        };
      },
    }),
    synthesizeContext: tool({
      description: 'Combine and deduplicate multiple contexts',
      parameters: z.object({
        contexts: z.array(z.string()),
      }),
      execute: async ({ contexts }) => {
        const uniqueContexts = [...new Set(contexts)];
        return {
          synthesized: uniqueContexts.join('\n\n---\n\n'),
          sourceCount: contexts.length,
        };
      },
    }),
  },
});
```

#### Response Agent

```typescript
import { lengthGuardrail, piiDetectionGuardrail } from '@tawk-agents-sdk/core';

const responseAgent = new Agent({
  name: 'Response',
  instructions: `You are a response agent that generates concise, accurate answers with citations.

IMPORTANT:
- Keep answers under 1500 characters
- Include document IDs as citations in format [doc-id]
- Answer based ONLY on the provided context`,
  guardrails: [
    lengthGuardrail({ type: 'output', maxLength: 1500, unit: 'characters' }),
    piiDetectionGuardrail({ type: 'output' }),
  ],
});
```

### 4. Configure Handoff Chain

```typescript
// Set up the handoff chain: Retrieval → Synthesis → Response
technicalRetrievalAgent.handoffs = [synthesisAgent];
generalRetrievalAgent.handoffs = [synthesisAgent];
domainRetrievalAgent.handoffs = [synthesisAgent];
synthesisAgent.handoffs = [responseAgent];
```

### 5. Orchestration Function

**The beauty of pure agent orchestration**: Just run the router agent, and the SDK handles all handoffs automatically!

```typescript
import { run } from '@tawk-agents-sdk/core';

async function agenticRAG(query: string): Promise<AgenticRAGResult> {
  const startTime = Date.now();

  // Pure agent orchestration: Router → Retrieval → Synthesis → Response
  // All routing and coordination happens through SDK handoffs - no hardcoded logic
  const result = await run(routerAgent, query, { maxTurns: 15 });

  // Extract information from result
  const handoffChain = result.metadata.handoffChain || [];
  const agentsUsed = [...new Set(handoffChain)];
  
  // Extract document IDs from tool calls
  const documentIds: string[] = [];
  const steps = (result as any).steps || [];
  for (const step of steps) {
    if (step.toolCalls) {
      for (const toolCall of step.toolCalls) {
        if (toolCall.toolName === 'searchKnowledgeBase' && toolCall.result) {
          const toolResult = toolCall.result;
          if (toolResult.documentIds) {
            documentIds.push(...toolResult.documentIds);
          }
        }
      }
    }
  }

  return {
    answer: result.finalOutput,
    citations: [...new Set(documentIds.filter(Boolean))],
    handoffChain,
    totalTokens: result.metadata.totalTokens || 0,
    latency: Date.now() - startTime,
    agentsUsed,
  };
}
```

## Key Benefits

### 1. **Pure Agent Orchestration**
- No hardcoded routing logic
- Agents make their own decisions
- SDK handles all handoffs automatically

### 2. **Flexible & Extensible**
- Easy to add new retrieval agents
- Modify routing rules by updating agent instructions
- No code changes needed for workflow changes

### 3. **Observable**
- Handoff chain tracked in metadata
- Tool calls logged automatically
- Easy to debug and monitor

### 4. **Production-Ready**
- Built-in guardrails
- Error handling
- Citation tracking
- Performance metrics

## Usage Example

```typescript
// Initialize embeddings (one-time setup)
async function initializeEmbeddings() {
  const embeddingModel = openai.embedding('text-embedding-3-small');
  for (const doc of knowledgeBase) {
    const result = await generateEmbeddingAI({
      model: embeddingModel,
      value: doc.text,
    });
    doc.embedding = result.embedding;
  }
}

// Use the agentic RAG system
await initializeEmbeddings();

const result = await agenticRAG('What is TypeScript?');

console.log('Answer:', result.answer);
console.log('Citations:', result.citations);
console.log('Handoff Chain:', result.handoffChain.join(' → '));
console.log('Agents Used:', result.agentsUsed.join(', '));
console.log('Latency:', result.latency, 'ms');
```

## Test Scenarios

### Scenario 1: Simple Single-Domain Query
```typescript
const result = await agenticRAG('What is TypeScript?');
// Router → Technical Retrieval → Synthesis → Response
```

### Scenario 2: Multi-Domain Query
```typescript
const result = await agenticRAG('How does TypeScript compare to JavaScript?');
// Router → Technical + General Retrieval → Synthesis → Response
```

### Scenario 3: Domain-Specific Query
```typescript
const result = await agenticRAG('What features does the Tawk Agents SDK support?');
// Router → Domain Retrieval → Synthesis → Response
```

## Best Practices

1. **Use Tools for Visibility**: Add logging tools (like `logRouting`) to track agent decisions
2. **Clear Instructions**: Write explicit instructions for when to hand off
3. **Guardrails**: Apply guardrails to final output (length, PII, etc.)
4. **Document IDs**: Always track document IDs for citations
5. **Error Handling**: Handle missing embeddings, empty results, etc.
6. **Performance**: Use `maxTurns` to prevent infinite loops

## Advanced Patterns

### Parallel Retrieval
The SDK automatically handles parallel handoffs when multiple agents are available. The router agent can hand off to multiple retrieval agents simultaneously.

### Conditional Synthesis
The synthesis agent can decide whether to combine contexts or pass through single results based on the number of sources.

### Dynamic Routing
Update router agent instructions to change routing logic without code changes. The agent learns and adapts.

## See Also

- [Multi-Agent Orchestration Guide](./CORE_CONCEPTS.md#multi-agent-orchestration)
- [Tool Calling Guide](./FEATURES.md#tool-calling)
- [Guardrails Guide](./FEATURES.md#guardrails)
- [E2E Test Example](../../tests/e2e/04-agentic-rag-e2e.test.ts)

---

**Ready to build?** This pattern provides a production-ready agentic RAG system using pure agent orchestration! 🎯

