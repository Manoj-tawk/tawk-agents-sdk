/**
 * E2E TEST 12: Agentic RAG with Pinecone - Multi-Agent System with Intelligent Routing
 *
 * @fileoverview
 * This test demonstrates a production-ready multi-agent RAG system with Pinecone vector database.
 * Uses intelligent triage routing with direct responses for optimal speed.
 *
 * Architecture (Multi-Agent with Direct Response):
 * 1. Triage Agent - Intelligent routing with confidence scoring
 * 2. Knowledge Agent - RAG specialist (searches all domains in parallel via Pinecone, generates direct response)
 * 3. Action Agent - Operational tasks specialist (executes tools, generates direct response)
 * 4. Escalation Agent - Human handoff specialist (creates escalation, generates direct response)
 *
 * Features:
 * - Intelligent triage with confidence scoring
 * - Pinecone vector database for semantic search
 * - Parallel domain search in Knowledge Agent
 * - Direct responses from specialist agents (no intermediate agents)
 * - Citation tracking and source attribution
 * - Graceful escalation for complex cases
 *
 * Optimizations:
 * - Multi-provider model selection (Groq for speed, Claude for quality)
 * - Query embedding caching (shared across agents)
 * - Parallel domain search (Promise.all)
 * - Reduced maxTurns (4 instead of 12)
 * - TOON encoding for token efficiency
 * - Direct responses (no Synthesis/Response agents)
 * - Temperature: 0 for deterministic tool calling
 *
 * Requirements:
 * - OPENAI_API_KEY in .env (for embeddings)
 * - GROQ_API_KEY in .env (for Triage and Action agents - fastest models)
 * - ANTHROPIC_API_KEY in .env (for Knowledge and Escalation agents - quality models)
 * - PINECONE_API_KEY in .env (for Pinecone vector database)
 * - PINECONE_INDEX_URL in .env (Pinecone index endpoint)
 * - PINECONE_INDEX_NAME in .env (optional, for logging)
 * - PINECONE_NAMESPACE in .env (optional, defaults to "default")
 * - Network connection
 *
 * @example
 * ```bash
 * npx ts-node tests/e2e/12-agentic-rag-with-pinecone.spec.ts
 * ```
 */

import 'dotenv/config';
import {
  Agent,
  run,
  tool,
  lengthGuardrail,
  piiDetectionGuardrail,
} from '../../src';
import { createPineconeSearchTool } from '../../src/tools/rag';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

console.log('\n🧪 E2E TEST 12: Agentic RAG with Pinecone - Multi-Agent System\n');
console.log('⚠️  This test makes REAL API calls and costs money!\n');

// ============================================
// PINECONE CONFIGURATION
// ============================================

const {
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME,
  PINECONE_INDEX_URL,
  PINECONE_NAMESPACE = 'default',
} = process.env;


// ============================================
// TYPES & INTERFACES
// ============================================



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
  agentPath: string; // e.g., "Triage → Knowledge"
}

// ============================================
// PINECONE SEARCH TOOL SETUP
// ============================================

/**
 * Create optimized Pinecone search tool with TOON encoding
 * 
 * This tool is reusable and can be used in any agent that needs RAG capabilities.
 * It's generic and works with any Pinecone index structure.
 */
const pineconeSearchTool = createPineconeSearchTool({
  indexUrl: PINECONE_INDEX_URL!,
  apiKey: PINECONE_API_KEY!,
  namespace: PINECONE_NAMESPACE,
  // Configure text-embedding-3-small to output 1024 dimensions to match Pinecone index
  // text-embedding-3-small default is 1536, but can be reduced via providerOptions
  embeddingModel: openai.embedding('text-embedding-3-small'),
  embeddingProviderOptions: {
    openai: {
      dimensions: 1024, // Match Pinecone index dimension
    },
  },
  useTOON: true,
  enableCache: true,
  logger: (message, ...args) => console.log(message, ...args),
});

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
  // Groq Llama 3.1 8B - Fastest model for routing decisions (ultra-low latency)
  model: openai('gpt-4o'),
  modelSettings: {
    temperature: 0,
  },
  instructions: `You are the triage agent for intelligent query routing.

Your role is to analyze customer queries and route them to the appropriate specialist agent with confidence scoring.

ROUTING RULES:
1. Knowledge Agent - For questions about:
   - Product features and how-to questions
   - Documentation and guides
   - General functionality
   - Troubleshooting with known solutions
   - Biographical, historical, scientific, or personal information queries

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
- Route to Knowledge Agent for documentation/knowledge queries
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
 * Handles all documentation and knowledge base queries using Pinecone.
 * Searches across all domains in parallel and generates direct responses.
 */
const knowledgeAgent = new Agent({
  name: 'Knowledge',
  // Claude 3.5 Sonnet - Best for RAG synthesis and complex reasoning
  model: anthropic('claude-3-5-sonnet-20241022'),
  modelSettings: {
    temperature: 0,
  },
  instructions: `You are the knowledge specialist for documentation and FAQ queries.

Your responsibilities:
1. Search across ALL domains using searchKnowledgeBase (searches Pinecone for all domain types)
2. Generate a concise, accurate answer with citations
3. Include document IDs as citations in format [doc-id]

WORKFLOW:
1. Call searchKnowledgeBase ONCE with the query (searches all domains automatically via Pinecone)
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
    searchKnowledgeBase: pineconeSearchTool,
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
  // Groq Llama 3.1 8B - Fastest for simple tool execution tasks
  model: openai('gpt-4o-mini'),
  modelSettings: {
    temperature: 0,
  },
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
  // Claude 3.5 Sonnet - Best for empathetic, professional customer communication
  model: anthropic('claude-sonnet-4-5-20250929'),
  modelSettings: {
    temperature: 0.3,
  },
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
  console.log('🚀 Starting Multi-Agent RAG with Pinecone - Intelligent Triage & Direct Response\n');

  // Multi-agent workflow: Triage → [Knowledge | Action | Escalation] → Direct Response
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
// TEST SCENARIOS - ALAN TURING FOCUSED
// ============================================

/**
 * Test Scenario 1: Simple Biographical Query
 *
 * Tests routing to biographical retrieval agent for straightforward biographical questions.
 */
async function test1_SimpleBiographical() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 1: Simple Biographical Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Where was Alan Turing born and what was his early education?');

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
 * Test Scenario 2: Multi-Domain Historical & Scientific Query
 *
 * Tests routing to multiple retrieval agents (historical + scientific) for complex queries.
 */
async function test2_MultiDomainHistoricalScientific() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 2: Multi-Domain Historical & Scientific Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('How did Alan Turing\'s work on the Enigma machine at Bletchley Park during WWII relate to his earlier theoretical work on computability and Turing machines?');

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
 * Test Scenario 3: Complex Multi-Agent Query (Biographical + Historical + Scientific)
 *
 * Tests handling of complex queries requiring multiple retrieval agents and deep synthesis.
 */
async function test3_ComplexMultiAgent() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 3: Complex Multi-Agent Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Explain the relationship between Turing\'s early friendship with Christopher Morcom, his academic work on the Entscheidungsproblem and Turing machines at Cambridge and Princeton, and his later cryptanalysis work at Bletchley Park. How did these experiences shape his contributions to computer science?');

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
 * Test Scenario 4: Scientific & Technical Deep Dive
 *
 * Tests routing to scientific retrieval agent for complex theoretical questions.
 */
async function test4_ScientificDeepDive() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 4: Scientific & Technical Deep Dive');
  console.log('='.repeat(80));

  const result = await agenticRAG('What was the Entscheidungsproblem, and how did Turing\'s solution using Turing machines differ from Alonzo Church\'s lambda calculus approach? What is the significance of the halting problem in this context?');

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
 * Test Scenario 5: Historical Context & Impact
 *
 * Tests routing to historical retrieval agent for questions about historical impact.
 */
async function test5_HistoricalImpact() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 5: Historical Context & Impact');
  console.log('='.repeat(80));

  const result = await agenticRAG('What was the impact of Turing\'s cryptanalysis work on the outcome of World War II? How did the bombe machine work, and what was the significance of the "Action This Day" memo from Churchill?');

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
 * Test Scenario 6: Personal & Legal Context
 *
 * Tests routing to personal retrieval agent for questions about personal life and legal issues.
 */
async function test6_PersonalLegal() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 6: Personal & Legal Context');
  console.log('='.repeat(80));

  const result = await agenticRAG('What were the circumstances surrounding Turing\'s conviction in 1952, and how did this affect his life and career? What was the "Alan Turing law" and when was he pardoned?');

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
 * Test Scenario 7: Post-War Scientific Contributions
 *
 * Tests routing to scientific retrieval agent for post-war work.
 */
async function test7_PostWarScientific() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 7: Post-War Scientific Contributions');
  console.log('='.repeat(80));

  const result = await agenticRAG('What were Turing\'s contributions to early computing after WWII? Explain his work on the ACE computer, the Turing test, and his research on morphogenesis and mathematical biology.');

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
 * Test Scenario 8: Ultimate Stress Test - All Domains
 *
 * Tests the system with a query that requires ALL retrieval agents to work together.
 */
async function test8_UltimateStressTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 8: Ultimate Stress Test - All Domains');
  console.log('='.repeat(80));

  const result = await agenticRAG('Provide a comprehensive analysis of Alan Turing\'s life: from his birth in London and education at Sherborne and Cambridge, through his groundbreaking work on computability and Turing machines, his crucial role in breaking Enigma at Bletchley Park during WWII, his post-war contributions to computing including the ACE and the Turing test, his work on morphogenesis, the personal and legal challenges he faced in the 1950s, his death, and his eventual recognition and legacy. How did all these aspects of his life interconnect?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 400)}...`);
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
 * Verify Pinecone connection
 *
 * Checks that Pinecone is accessible and configured correctly.
 * This is a lightweight check that runs before tests.
 */
async function verifyPineconeConnection(): Promise<void> {
  console.log('🔧 Verifying Pinecone connection...');

  if (!PINECONE_INDEX_URL || !PINECONE_API_KEY) {
    throw new Error('Pinecone configuration missing. Please set PINECONE_INDEX_URL and PINECONE_API_KEY in .env');
  }

  if (!PINECONE_INDEX_NAME) {
    console.warn('⚠️  PINECONE_INDEX_NAME not set. Using index URL directly.');
  }

  console.log(`✅ Pinecone configured: ${PINECONE_INDEX_NAME || PINECONE_INDEX_URL}`);
  console.log(`   Namespace: ${PINECONE_NAMESPACE}\n`);
}

// ============================================
// TEST RUNNER
// ============================================

/**
 * Run all E2E test scenarios
 *
 * Executes all 8 test scenarios and provides a summary with metrics.
 * Handles errors gracefully and exits with code 1 on failure.
 */
async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  let totalCost = 0;
  let totalTokens = 0;

  try {
    // Verify Pinecone connection first
    await verifyPineconeConnection();

    // Run all scenarios
    // const result1 = await test1_SimpleBiographical();
    // totalTokens += result1.totalTokens;
    // totalCost += (result1.totalTokens * 0.00015) / 1000;

    // const result2 = await test2_MultiDomainHistoricalScientific();
    // totalTokens += result2.totalTokens;
    // totalCost += (result2.totalTokens * 0.00015) / 1000;

    // const result3 = await test3_ComplexMultiAgent();
    // totalTokens += result3.totalTokens;
    // totalCost += (result3.totalTokens * 0.00015) / 1000;

    // const result4 = await test4_ScientificDeepDive();
    // totalTokens += result4.totalTokens;
    // totalCost += (result4.totalTokens * 0.00015) / 1000;

    // const result5 = await test5_HistoricalImpact();
    // totalTokens += result5.totalTokens;
    // totalCost += (result5.totalTokens * 0.00015) / 1000;

    // const result6 = await test6_PersonalLegal();
    // totalTokens += result6.totalTokens;
    // totalCost += (result6.totalTokens * 0.00015) / 1000;

    // const result7 = await test7_PostWarScientific();
    // totalTokens += result7.totalTokens;
    // totalCost += (result7.totalTokens * 0.00015) / 1000;

    const result8 = await test8_UltimateStressTest();
    totalTokens += result8.totalTokens;
    totalCost += (result8.totalTokens * 0.00015) / 1000;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '━'.repeat(80));
    console.log('✅ ALL AGENTIC RAG E2E TESTS COMPLETED!');
    console.log('━'.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📊 Total Tokens: ${totalTokens}`);
    console.log(`💰 Total Cost: ~$${totalCost.toFixed(6)}`);
    console.log(`📈 Average Latency: ${((Date.now() - startTime) / 8 / 1000).toFixed(2)}s per query`);
    console.log(`🤖 Agents Available: Triage, Knowledge, Action, Escalation`);
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
  console.error('💡 Required for embeddings (text-embedding-3-small)\n');
  process.exit(1);
}

if (!process.env.GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY not found in environment');
  console.error('💡 Required for Triage and Action agents (fastest models)\n');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
  console.error('💡 Required for Knowledge and Escalation agents (quality models)\n');
  process.exit(1);
}

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_URL) {
  console.error('❌ Error: Pinecone configuration missing');
  console.error('💡 Required environment variables:');
  console.error('   - PINECONE_API_KEY');
  console.error('   - PINECONE_INDEX_URL');
  console.error('   - PINECONE_INDEX_NAME (optional)');
  console.error('   - PINECONE_NAMESPACE (optional, defaults to "default")\n');
  process.exit(1);
}

// Run all tests
runAllTests();

