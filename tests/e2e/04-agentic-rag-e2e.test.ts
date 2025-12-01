/**
 * E2E TEST 04: Multi-Agent RAG System with Intelligent Routing
 * 
 * @fileoverview
 * This test demonstrates a production-ready multi-agent RAG system with intelligent routing.
 * 
 * Architecture (Multi-Agent with Direct Response):
 * 1. Triage Agent - Intelligent routing with confidence scoring
 * 2. Knowledge Agent - RAG specialist (searches all domains, generates direct response)
 * 3. Action Agent - Operational tasks specialist (executes tools, generates direct response)
 * 4. Escalation Agent - Human handoff specialist (creates escalation, generates direct response)
 * 
 * Features:
 * - Intelligent triage with confidence scoring
 * - Parallel domain search in Knowledge Agent
 * - Direct responses from specialist agents (no intermediate agents)
 * - Citation tracking and source attribution
 * - Graceful escalation for complex cases
 * 
 * Optimizations:
 * - Query embedding caching (shared across agents)
 * - Batch embedding generation
 * - Parallel domain search (Promise.all)
 * - Reduced maxTurns (4 instead of 6-10)
 * - TOON encoding for token efficiency
 * - Direct responses (no Synthesis/Response agents)
 * 
 * Requirements:
 * - OPENAI_API_KEY in .env (for main agent and embeddings)
 * - Network connection
 * 
 * @example
 * ```bash
 * npx ts-node tests/e2e/04-agentic-rag-e2e.test.ts
 * ```
 */

import 'dotenv/config';
import {
  Agent,
  run,
  tool,
  setDefaultModel,
  generateEmbeddingAI,
  generateEmbeddingsAI,
  cosineSimilarity,
  lengthGuardrail,
  piiDetectionGuardrail,
} from '../../src';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Set default model - Using OpenAI GPT-5.1 for optimal performance
setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🧪 E2E TEST 04: Agentic RAG with Multi-Agent Workflow\n');
console.log('⚠️  This test makes REAL API calls and costs money!\n');

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Document structure for the knowledge base
 */
interface Document {
  id: string;
  text: string;
  domain: 'technical' | 'general' | 'domain';
  embedding?: number[];
}

/**
 * Result structure for agentic RAG queries
 */
interface AgenticRAGResult {
  answer: string;
  citations: string[];
  handoffChain: string[];
  totalTokens: number;
  latency: number;
  agentsUsed: string[];
  confidence?: number;
  requiresEscalation?: boolean;
  agentPath: string; // e.g., "Triage → Knowledge → Synthesis → Response"
}

// ============================================
// KNOWLEDGE BASE SETUP
// ============================================

/**
 * Sample knowledge base with documents across three domains:
 * - Technical: Code, frameworks, APIs
 * - General: General knowledge and definitions
 * - Domain: SDK and company-specific information
 */
const knowledgeBase: Document[] = [
  // Technical documents
  { id: 'tech-1', domain: 'technical', text: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static type definitions to JavaScript, enabling better tooling and error detection.' },
  { id: 'tech-2', domain: 'technical', text: 'Next.js is a React framework for production. It provides server-side rendering, static site generation, and API routes out of the box.' },
  { id: 'tech-3', domain: 'technical', text: 'React is a JavaScript library for building user interfaces. It uses a component-based architecture and virtual DOM for efficient updates.' },
  { id: 'tech-4', domain: 'technical', text: 'Authentication in web applications typically involves JWT tokens, session management, and OAuth protocols. Next.js supports multiple authentication strategies.' },
  { id: 'tech-5', domain: 'technical', text: 'TypeScript provides interfaces, classes, and type inference. It helps catch errors at compile time rather than runtime.' },
  
  // General knowledge documents
  { id: 'gen-1', domain: 'general', text: 'JavaScript is a high-level programming language that is one of the core technologies of the World Wide Web. It enables interactive web pages.' },
  { id: 'gen-2', domain: 'general', text: 'Programming languages can be categorized as compiled or interpreted. JavaScript is interpreted, while TypeScript is compiled to JavaScript.' },
  { id: 'gen-3', domain: 'general', text: 'Web frameworks simplify development by providing structure and common patterns. Popular frameworks include React, Vue, and Angular.' },
  
  // Domain-specific documents
  { id: 'dom-1', domain: 'domain', text: 'Tawk Agents SDK provides AI agent capabilities with multi-agent orchestration, tool calling, and guardrails. It supports embeddings, image generation, and audio processing.' },
  { id: 'dom-2', domain: 'domain', text: 'The SDK supports handoffs between agents, allowing specialized agents to handle specific tasks. This enables complex workflows and better task distribution.' },
];

/**
 * In-memory vector store for semantic search
 * 
 * Groups documents by domain and provides semantic search using cosine similarity.
 * Used by retrieval agents to find relevant documents.
 */
class VectorStore {
  private documents: Map<string, Document[]>;

  constructor() {
    this.documents = new Map();
    // Group documents by domain for efficient retrieval
    for (const doc of knowledgeBase) {
      if (!this.documents.has(doc.domain)) {
        this.documents.set(doc.domain, []);
      }
      this.documents.get(doc.domain)!.push(doc);
    }
  }

  /**
   * Search for documents using semantic similarity
   * 
   * @param queryEmbedding - Query embedding vector
   * @param domain - Domain to search in ('technical' | 'general' | 'domain')
   * @param topK - Number of top results to return (default: 5)
   * @returns Array of documents with similarity scores, sorted by relevance
   */
  async search(
    queryEmbedding: number[],
    domain: string,
    topK: number = 5
  ): Promise<Array<{ doc: Document; score: number }>> {
    const domainDocs = this.documents.get(domain) || [];
    
    const results = domainDocs
      .filter(doc => doc.embedding)
      .map(doc => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  /**
   * Get a document by ID
   * 
   * @param id - Document ID
   * @returns Document or undefined if not found
   */
  getDocument(id: string): Document | undefined {
    return knowledgeBase.find(doc => doc.id === id);
  }
}

const vectorStore = new VectorStore();

// ============================================
// OPTIMIZATION: Query Embedding Cache
// ============================================

/**
 * Shared query embedding cache to avoid redundant API calls
 * 
 * When multiple retrieval agents are called, they all need the same query embedding.
 * This cache ensures we only generate it once and share it across all agents.
 */
class QueryEmbeddingCache {
  private cache = new Map<string, number[]>();
  private embeddingModel = openai.embedding('text-embedding-3-small');

  /**
   * Get embedding for a query (cached)
   * 
   * @param query - Query text
   * @returns Query embedding vector
   */
  async getEmbedding(query: string): Promise<number[]> {
    const cacheKey = query.toLowerCase().trim();
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await generateEmbeddingAI({
      model: this.embeddingModel,
      value: query,
    });
    
    this.cache.set(cacheKey, result.embedding);
    return result.embedding;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

const queryEmbeddingCache = new QueryEmbeddingCache();

// ============================================
// AGENT DEFINITIONS
// ============================================

/**
 * Triage Agent (Orchestrator)
 * 
 * Intelligent routing agent that analyzes queries and routes to appropriate specialist agents.
 * Uses confidence scoring to determine routing decisions.
 */
const triageAgent = new Agent({
  name: 'Triage',
  instructions: `You are the triage agent for intelligent query routing.

Your role is to analyze customer queries and route them to the appropriate specialist agent with confidence scoring.

ROUTING RULES:
1. Knowledge Agent - For questions about:
   - Product features and how-to questions
   - Documentation and guides
   - General functionality
   - Troubleshooting with known solutions

2. Action Agent - For requests requiring:
   - Creating/updating tickets (simulated)
   - Checking account status
   - System status checks
   - Configuration queries

3. Escalation Agent - For sensitive/complex issues:
   - Billing disputes
   - Legal matters
   - Repeated failures (>2 attempts)
   - Explicit escalation requests
   - Complex technical issues beyond docs

DECISION PROCESS:
- Analyze query intent and complexity
- Assign confidence score (0.0-1.0)
- If confidence < 0.7, route to Escalation Agent
- Route to Knowledge Agent for documentation queries
- Route to Action Agent for operational tasks

Be fast and decisive. Route immediately without hesitation.`,
  tools: {
    logRouting: tool({
      description: 'Log routing decision for visibility and debugging',
      inputSchema: z.object({
        decision: z.string().describe('Routing decision explanation'),
        targetAgent: z.string().describe('Target agent name'),
        confidence: z.number().min(0).max(1).describe('Confidence score (0.0-1.0)'),
      }),
      execute: async ({ decision, targetAgent, confidence }) => {
        console.log(`\n   🎯 Triage Decision: ${decision}`);
        console.log(`   📍 Routing to: ${targetAgent} (confidence: ${(confidence * 100).toFixed(0)}%)`);
        return { logged: true, decision, targetAgent, confidence };
      },
    }),
  },
  handoffs: [], // Will be set after other agents are created
  useTOON: true,
});

/**
 * Knowledge Agent (RAG Specialist)
 * 
 * Handles all documentation and knowledge base queries.
 * Searches across all domains in parallel and generates direct responses.
 */
const knowledgeAgent = new Agent({
  name: 'Knowledge',
  instructions: `You are the knowledge specialist for documentation and FAQ queries.

Your responsibilities:
1. Search across ALL domains (technical, general, domain) using searchKnowledgeBase
2. Generate a concise, accurate answer with citations
3. Include document IDs as citations in format [doc-id]

WORKFLOW:
1. Call searchKnowledgeBase ONCE with the query (searches all domains automatically)
2. Generate final answer based on the retrieved context
3. Include citations in format [doc-id] at the end

RESPONSE GUIDELINES:
- Keep answers under 1500 characters
- Be concise but complete
- Always cite sources using [doc-id] format
- Answer based ONLY on the provided context
- If context is insufficient, say so clearly

CRITICAL: Complete the entire workflow in minimal turns. Be fast and efficient.`,
  tools: {
    searchKnowledgeBase: tool({
      description: 'Search knowledge base across all domains (technical, general, domain) using semantic similarity. Returns top results from all domains combined.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        topK: z.number().default(5).describe('Number of results to return (searches all domains)'),
      }),
      execute: async ({ query, topK }) => {
        // ✅ OPTIMIZED: Use cached query embedding (shared across agents)
        const queryEmbedding = await queryEmbeddingCache.getEmbedding(query);

        // Search all domains in parallel for speed
        const [techResults, genResults, domResults] = await Promise.all([
          vectorStore.search(queryEmbedding, 'technical', topK),
          vectorStore.search(queryEmbedding, 'general', topK),
          vectorStore.search(queryEmbedding, 'domain', topK),
        ]);

        // Combine and sort by score
        const allResults = [
          ...techResults.map(r => ({ ...r, domain: 'technical' as const })),
          ...genResults.map(r => ({ ...r, domain: 'general' as const })),
          ...domResults.map(r => ({ ...r, domain: 'domain' as const })),
        ].sort((a, b) => b.score - a.score).slice(0, topK);

        console.log(`   🔍 Knowledge: Found ${allResults.length} documents across all domains`);
        allResults.forEach((r, i) => {
          console.log(`      ${i + 1}. [${r.doc.id}] (${r.domain}) Score: ${r.score.toFixed(4)}`);
        });

        return {
          documents: allResults.map(r => ({
            id: r.doc.id,
            text: r.doc.text,
            score: r.score,
            domain: r.domain,
          })),
          context: allResults.map(r => r.doc.text).join('\n\n'),
          documentIds: allResults.map(r => r.doc.id),
        };
      },
    }),
  },
  guardrails: [
    lengthGuardrail({ type: 'output', maxLength: 1500, unit: 'characters' }),
    piiDetectionGuardrail({ type: 'output' }),
  ],
  handoffs: [], // Direct response - no handoffs
  useTOON: true,
});

/**
 * Action Agent (Tool Execution Specialist)
 * 
 * Handles operational tasks like ticket management, account queries, and system checks.
 * Generates direct responses after executing tools.
 */
const actionAgent = new Agent({
  name: 'Action',
  instructions: `You are the action specialist for operational tasks.

Your responsibilities:
1. Execute operations (simulated in this test)
2. Create, update, and search tickets
3. Check account status and system health
4. Perform configuration queries
5. Generate clear, actionable responses

OPERATION GUIDELINES:
- Always confirm actions clearly
- Provide clear confirmation messages
- Handle errors gracefully with helpful messages
- Keep responses under 1500 characters
- Be concise and actionable

CRITICAL: Execute tools and generate direct response. No handoffs needed.`,
  tools: {
    checkSystemStatus: tool({
      description: 'Check system status (simulated)',
      inputSchema: z.object({
        service: z.enum(['api', 'dashboard', 'chat', 'mobile']).optional(),
      }),
      execute: async ({ service }) => {
        // Simulated system status
        return {
          status: 'operational',
          service: service || 'all',
          lastChecked: new Date().toISOString(),
          message: `System ${service || 'services'} are operational`,
        };
      },
    }),
    getAccountInfo: tool({
      description: 'Get account information (simulated)',
      inputSchema: z.object({
        accountId: z.string().optional(),
      }),
      execute: async ({ accountId }) => {
        // Simulated account info
        return {
          accountId: accountId || 'demo-account',
          tier: 'pro',
          status: 'active',
          openTickets: 2,
          message: 'Account is active and in good standing',
        };
      },
    }),
  },
  guardrails: [
    lengthGuardrail({ type: 'output', maxLength: 1500, unit: 'characters' }),
    piiDetectionGuardrail({ type: 'output' }),
  ],
  handoffs: [], // Direct response - no handoffs
  useTOON: true,
});

/**
 * Escalation Agent (Human Handoff Specialist)
 * 
 * Handles complex cases requiring human agents or when confidence is low.
 * Generates direct escalation responses.
 */
const escalationAgent = new Agent({
  name: 'Escalation',
  instructions: `You are the escalation specialist for complex cases.

Your responsibilities:
1. Handle complex cases requiring human agents
2. Summarize conversation context
3. Determine urgency and priority
4. Generate professional escalation response

ESCALATION TRIGGERS:
- Billing disputes or refund requests
- Legal or compliance matters
- Repeated AI failures (>2 attempts)
- User explicitly requests human agent
- Sensitive account issues
- Complex technical problems beyond documentation

RESPONSE GUIDELINES:
- Acknowledge escalation professionally
- Summarize issue concisely
- Set expectations (wait time, next steps)
- Keep responses under 1500 characters
- Be empathetic and professional

TONE:
- Empathetic and professional
- Acknowledge frustration if present
- Build confidence in human agent capability

CRITICAL: Generate direct escalation response. No handoffs needed.`,
  tools: {
    createEscalation: tool({
      description: 'Create escalation case (simulated)',
      inputSchema: z.object({
        reason: z.string().describe('Escalation reason'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Priority level'),
        summary: z.string().describe('Issue summary'),
      }),
      execute: async ({ reason, priority, summary }) => {
        console.log(`\n   🚨 Escalation Created: ${reason} (${priority} priority)`);
        return {
          escalationId: `ESC-${Date.now()}`,
          reason,
          priority,
          summary,
          estimatedWaitTime: priority === 'urgent' ? '5-10 minutes' : '15-30 minutes',
          message: 'Your case has been escalated to a human agent. They will respond shortly.',
        };
      },
    }),
  },
  guardrails: [
    lengthGuardrail({ type: 'output', maxLength: 1500, unit: 'characters' }),
    piiDetectionGuardrail({ type: 'output' }),
  ],
  handoffs: [], // Direct response - no handoffs
  useTOON: true,
});

// Configure handoff chain: Triage → [Knowledge | Action | Escalation]
triageAgent.handoffs = [knowledgeAgent, actionAgent, escalationAgent];

// ============================================
// ORCHESTRATION FUNCTION
// ============================================

/**
 * Main orchestration function for multi-agent RAG with intelligent routing
 * 
 * This function demonstrates optimized multi-agent RAG with intelligent triage.
 * Triage agent routes to appropriate specialist agents (Knowledge/Action/Escalation).
 * Each specialist agent generates direct responses - no intermediate agents.
 * 
 * @param query - User query to process
 * @returns AgenticRAGResult with answer, citations, handoff chain, and metrics
 * 
 * @example
 * ```typescript
 * const result = await agenticRAG('What is TypeScript?');
 * console.log(result.answer);
 * ```
 */
async function agenticRAG(query: string): Promise<AgenticRAGResult> {
  const startTime = Date.now();

  console.log(`\n📝 Query: "${query}"`);
  console.log('━'.repeat(80));
  console.log('🚀 Starting Multi-Agent RAG - Intelligent Triage & Direct Response\n');

  // Multi-agent workflow: Triage → [Knowledge | Action | Escalation] → Direct Response
  // ✅ OPTIMIZED: Reduced maxTurns to 4 (workflow: Triage 1, Specialist 1-2, Response 1 = 3-4 turns)
  const result = await run(triageAgent, query, { maxTurns: 4 });

  // Extract handoff chain from metadata
  const handoffChain = result.metadata.handoffChain || [];
  const agentsUsed = [...new Set(handoffChain)];
  
  // Extract document IDs from tool calls across all steps
  const documentIds: string[] = [];
  const steps = (result as any).steps || [];
  for (const step of steps) {
    if (step.toolCalls) {
      for (const toolCall of step.toolCalls) {
        if (toolCall.toolName === 'searchKnowledgeBase' && toolCall.result) {
          const toolResult = toolCall.result;
          if (toolResult.documentIds) {
            documentIds.push(...toolResult.documentIds);
          } else if (toolResult.documents) {
            documentIds.push(
              ...toolResult.documents
                .map((d: any) => d.id || d.documentId)
                .filter(Boolean)
            );
          }
        }
      }
    }
  }

  const latency = Date.now() - startTime;

  // Determine if escalation occurred
  const requiresEscalation = handoffChain.includes('Escalation');
  
  // Calculate confidence (simplified - in production, extract from agent responses)
  const confidence = requiresEscalation ? 0.5 : 0.85;

  // Build agent path string
  const agentPath = handoffChain.length > 0 ? handoffChain.join(' → ') : 'Triage';

  return {
    answer: result.finalOutput,
    citations: [...new Set(documentIds.filter(Boolean))],
    handoffChain,
    totalTokens: result.metadata.totalTokens || 0,
    latency,
    agentsUsed,
    confidence,
    requiresEscalation,
    agentPath,
  };
}

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Test Scenario 1: Simple Single-Domain Query
 * 
 * Tests routing to a single retrieval agent for a straightforward query.
 */
async function test1_SimpleSingleDomain() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 1: Simple Single-Domain Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('What is TypeScript?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Agent Path: ${result.agentPath}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(0)}%`);
  if (result.requiresEscalation) {
    console.log(`🚨 Escalation: Required`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 2: Multi-Domain Query
 * 
 * Tests routing to multiple retrieval agents for queries spanning multiple domains.
 */
async function test2_MultiDomain() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 2: Multi-Domain Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('How does TypeScript compare to JavaScript, and what are the performance implications?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Agent Path: ${result.agentPath}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(0)}%`);
  if (result.requiresEscalation) {
    console.log(`🚨 Escalation: Required`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 3: Ambiguous Query
 * 
 * Tests handling of ambiguous queries that could match multiple domains.
 */
async function test3_AmbiguousQuery() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 3: Ambiguous Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Tell me about React');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Agent Path: ${result.agentPath}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(0)}%`);
  if (result.requiresEscalation) {
    console.log(`🚨 Escalation: Required`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 4: Complex Multi-Step Query
 * 
 * Tests handling of complex queries requiring multiple retrieval agents and synthesis.
 */
async function test4_ComplexMultiStep() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 4: Complex Multi-Step Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Explain how to implement authentication in a Next.js app using TypeScript, and compare it with alternative approaches');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Agent Path: ${result.agentPath}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(0)}%`);
  if (result.requiresEscalation) {
    console.log(`🚨 Escalation: Required`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 5: Domain-Specific Query
 * 
 * Tests routing to domain-specific retrieval agent for SDK/company queries.
 */
async function test5_DomainSpecific() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 5: Domain-Specific Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('What features does the Tawk Agents SDK support?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Agent Path: ${result.agentPath}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Confidence: ${(result.confidence! * 100).toFixed(0)}%`);
  if (result.requiresEscalation) {
    console.log(`🚨 Escalation: Required`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize embeddings for all documents in the knowledge base
 * 
 * Generates embeddings for each document to enable semantic search.
 * This is a one-time setup that runs before tests.
 */
async function initializeEmbeddings(): Promise<void> {
  console.log('🔧 Initializing embeddings for knowledge base...');
  const embeddingModel = openai.embedding('text-embedding-3-small');

  // ✅ OPTIMIZED: Use batch processing (5x faster than individual calls)
  try {
    const texts = knowledgeBase.map(doc => doc.text);
    const result = await generateEmbeddingsAI({
      model: embeddingModel,
      values: texts,
    });

    // Assign embeddings to documents
    // result.embeddings is number[][] (array of embedding vectors)
    knowledgeBase.forEach((doc, i) => {
      doc.embedding = result.embeddings[i];
    });
  } catch (error) {
    console.error(`❌ Failed to generate embeddings:`, error);
    throw error;
  }

  console.log(`✅ Generated embeddings for ${knowledgeBase.length} documents (batch processed)\n`);
}

// ============================================
// TEST RUNNER
// ============================================

/**
 * Run all E2E test scenarios
 * 
 * Executes all 5 test scenarios and provides a summary with metrics.
 * Handles errors gracefully and exits with code 1 on failure.
 */
async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  let totalCost = 0;
  let totalTokens = 0;

  try {
    // Initialize embeddings first
    await initializeEmbeddings();

    // Run all scenarios
    const result1 = await test1_SimpleSingleDomain();
    totalTokens += result1.totalTokens;
    totalCost += (result1.totalTokens * 0.00015) / 1000;

    const result2 = await test2_MultiDomain();
    totalTokens += result2.totalTokens;
    totalCost += (result2.totalTokens * 0.00015) / 1000;

    const result3 = await test3_AmbiguousQuery();
    totalTokens += result3.totalTokens;
    totalCost += (result3.totalTokens * 0.00015) / 1000;

    const result4 = await test4_ComplexMultiStep();
    totalTokens += result4.totalTokens;
    totalCost += (result4.totalTokens * 0.00015) / 1000;

    const result5 = await test5_DomainSpecific();
    totalTokens += result5.totalTokens;
    totalCost += (result5.totalTokens * 0.00015) / 1000;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '━'.repeat(80));
    console.log('✅ ALL AGENTIC RAG E2E TESTS COMPLETED!');
    console.log('━'.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📊 Total Tokens: ${totalTokens}`);
    console.log(`💰 Total Cost: ~$${totalCost.toFixed(6)}`);
    console.log(`📈 Average Latency: ${((Date.now() - startTime) / 5 / 1000).toFixed(2)}s per query`);
    console.log('━'.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ E2E TEST FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================
// ENTRY POINT
// ============================================

// Validate environment
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in environment');
  console.error('💡 Create a .env file with: OPENAI_API_KEY=sk-...\n');
  process.exit(1);
}

// Run all tests
runAllTests();

