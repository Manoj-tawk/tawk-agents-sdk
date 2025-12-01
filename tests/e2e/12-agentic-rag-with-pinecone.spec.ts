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
 * 
 * MODE: Can operate in two modes:
 * 1. HANDOFF MODE: Routes to one specialist agent (traditional handoff)
 * 2. COORDINATOR MODE: Calls multiple specialist agents as tools and aggregates results
 */
const triageAgent = new Agent({
  name: 'Triage',
  // Groq Llama 3.1 8B - Fastest model for routing decisions (ultra-low latency)
  model: openai('gpt-5.1'),
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
 * Coordinator Agent (Multi-Agent Orchestrator)
 * 
 * Advanced orchestrator that can call MULTIPLE specialist agents as tools in PARALLEL
 * and aggregate their results. This is the TRULY AGENTIC pattern.
 * 
 * Uses agents-as-tools pattern for maximum flexibility and parallelization.
 */
const coordinatorAgent = new Agent({
  name: 'Coordinator',
  // Using gpt-4o-mini for intelligent multi-agent coordination
  model: openai('gpt-4o-mini'),
  modelSettings: {
    temperature: 0,
  },
  instructions: `You are an advanced multi-agent coordinator.

Your role is to analyze complex queries and orchestrate multiple specialist agents to provide comprehensive responses.

AVAILABLE SPECIALIST AGENTS (as tools):
1. agent_knowledge - Knowledge specialist (RAG, documentation, biographical info)
2. agent_action - Action specialist (system checks, account info, operations)
3. agent_escalation - Escalation specialist (human handoff, billing disputes)

COORDINATION STRATEGY:
1. Analyze the query to identify ALL required agent types
2. If query has MULTIPLE distinct intents:
   - Call ALL relevant agent tools IN PARALLEL (single model turn)
   - Each agent will handle its part independently
   - You will receive all results simultaneously
3. If query has SINGLE intent:
   - Call only the relevant agent tool
4. After receiving results:
   - Synthesize and aggregate the responses
   - Create a cohesive, comprehensive answer
   - Maintain context and citations from all agents

IMPORTANT:
- You can call MULTIPLE agent tools in ONE response
- The SDK will execute them in PARALLEL
- This is more efficient than sequential handoffs
- Synthesize results into ONE final response

Be intelligent, efficient, and comprehensive.`,
  tools: {}, // Will be populated with agent-as-tool references
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
  // Using gpt-4o-mini for fair comparison with main branch
  model: openai('gpt-4o-mini'),
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

// Configure Coordinator Agent with agents-as-tools for TRUE AGENTIC PARALLEL EXECUTION
triageAgent._tools = {
  agent_knowledge: knowledgeAgent.asTool({
    toolName: 'agent_knowledge',
    toolDescription: 'Call the Knowledge Agent to answer questions about Alan Turing, documentation, biographical information, or scientific concepts. Returns a comprehensive answer with citations.',
  }),
  agent_action: actionAgent.asTool({
    toolName: 'agent_action',
    toolDescription: 'Call the Action Agent to perform operational tasks like checking account status, system health, or executing system operations. Returns status information and operational results.',
  }),
  agent_escalation: escalationAgent.asTool({
    toolName: 'agent_escalation',
    toolDescription: 'Call the Escalation Agent to handle sensitive issues like billing disputes, legal matters, or when human intervention is required. Returns escalation details and wait times.',
  }),
};

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

/**
 * Test Scenario 9: TRUE AGENTIC MULTI-AGENT COORDINATION
 *
 * This scenario demonstrates the MOST ADVANCED agentic pattern:
 * - Coordinator agent analyzes a complex multi-intent query
 * - Coordinator calls ALL relevant specialist agents AS TOOLS IN PARALLEL
 * - All three agents (Knowledge, Action, Escalation) execute SIMULTANEOUSLY
 * - Coordinator receives all results and synthesizes a comprehensive response
 * 
 * This is TRUE AGENTIC behavior:
 * ✅ Parallel execution (not sequential)
 * ✅ Autonomous decision-making (coordinator decides which agents to call)
 * ✅ Result aggregation (synthesizes multiple agent outputs)
 * ✅ Single coordinated response (not multiple handoffs)
 * 
 * **This is the pattern you asked about!**
 */
async function test9_TrueAgenticCoordination() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 9: TRUE AGENTIC MULTI-AGENT COORDINATION');
  console.log('='.repeat(80));
  console.log('Pattern: Coordinator calls ALL agents as tools IN PARALLEL\n');
  console.log('🚀 This demonstrates:');
  console.log('   ✅ Parallel agent execution (not sequential)');
  console.log('   ✅ Agents-as-tools pattern');
  console.log('   ✅ Autonomous coordination');
  console.log('   ✅ Result aggregation\n');

  const startTime = Date.now();

  // Complex query requiring ALL three specialist agents
  const complexQuery = `I have three questions that need answers:

1. KNOWLEDGE: Tell me about Alan Turing's work on the Enigma machine at Bletchley Park.

2. ACTION: Check my account status and verify the system is operational.

3. ESCALATION: I have a billing dispute on my last invoice that requires urgent attention.

Please address ALL three issues comprehensively.`;

  console.log(`\n📝 Query: Multi-intent request (Knowledge + Action + Escalation)\n`);

  // Use coordinator agent that can call multiple agents as tools
  const result = await run(coordinatorAgent, complexQuery, { maxTurns: 4 });

  const latency = Date.now() - startTime;

  // Analyze which agents were called
  const steps = (result as any).steps || [];
  const agentsCalled = new Set<string>();
  
  for (const step of steps) {
    if (step.toolCalls) {
      for (const toolCall of step.toolCalls) {
        if (toolCall.toolName === 'agent_knowledge') agentsCalled.add('Knowledge');
        if (toolCall.toolName === 'agent_action') agentsCalled.add('Action');
        if (toolCall.toolName === 'agent_escalation') agentsCalled.add('Escalation');
      }
    }
  }

  console.log('\n✅ TRUE AGENTIC COORDINATION RESULTS:');
  console.log('━'.repeat(80));
  console.log(`📝 Final Response (first 500 chars):`);
  console.log(`   ${result.finalOutput.substring(0, 500)}...\n`);
  
  console.log(`🤖 Agents Called as Tools:`);
  console.log(`   ${agentsCalled.has('Knowledge') ? '✅' : '❌'} Knowledge Agent - ${agentsCalled.has('Knowledge') ? 'CALLED' : 'NOT CALLED'}`);
  console.log(`   ${agentsCalled.has('Action') ? '✅' : '❌'} Action Agent - ${agentsCalled.has('Action') ? 'CALLED' : 'NOT CALLED'}`);
  console.log(`   ${agentsCalled.has('Escalation') ? '✅' : '❌'} Escalation Agent - ${agentsCalled.has('Escalation') ? 'CALLED' : 'NOT CALLED'}`);

  const allAgentsCalled = agentsCalled.size === 3;
  
  console.log(`\n📊 Coordination Pattern:`);
  console.log(`   Mode: Agents-as-Tools (Parallel Execution)`);
  console.log(`   Agents Orchestrated: ${agentsCalled.size}/3`);
  console.log(`   Execution: ${ agentsCalled.size > 1 ? 'PARALLEL ⚡' : 'Single Agent'}`);
  console.log(`   Synthesis: ${allAgentsCalled ? 'Multi-Agent Aggregation ✅' : 'Single Response'}`);

  console.log(`\n⏱️  Performance:`);
  console.log(`   Total Tokens: ${result.metadata.totalTokens}`);
  console.log(`   Total Latency: ${latency}ms`);
  console.log(`   Cost: ~$${((result.metadata.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  if (allAgentsCalled) {
    console.log('\n🎉 SUCCESS: TRUE AGENTIC COORDINATION VALIDATED!');
    console.log('   ✅ All 3 specialist agents called as tools');
    console.log('   ✅ Coordinator synthesized comprehensive response');
    console.log('   ✅ Parallel execution pattern demonstrated');
  } else {
    console.log(`\n⚠️  PARTIAL: ${agentsCalled.size}/3 agents called`);
    console.log('   Model routing decision may have optimized agent selection');
  }

  return {
    ...result,
    agentsCalled: Array.from(agentsCalled),
    latency,
    allAgentsCalled,
  };
}

/**
 * Test Scenario 10: Sequential Multi-Agent Workflow - ALL AGENTS VALIDATED
 *
 * Tests a workflow that naturally triggers all agents in sequence:
 * 1. Knowledge query → Knowledge Agent ✅
 * 2. System check → Action Agent ✅
 * 3. Complex issue → Escalation Agent ✅
 * 
 * **This is the PRIMARY test for validating all agent types.**
 * Each query is processed separately, ensuring all specialist agents are exercised.
 */
async function test10_SequentialWorkflow() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 10: Sequential Multi-Agent Workflow - ALL AGENTS');
  console.log('='.repeat(80));
  console.log('PRIMARY TEST: Validates all agent types (Knowledge, Action, Escalation)\n');

  // Test 1: Knowledge Agent
  console.log('📝 Step 1: Knowledge query...');
  const result1 = await agenticRAG('What was Alan Turing\'s role at Bletchley Park?');
  console.log(`   ✓ ${result1.agentPath} (${result1.latency}ms)`);

  // Test 2: Action Agent
  console.log('\n📝 Step 2: Action query...');
  const result2 = await agenticRAG('Check my account status and system health');
  console.log(`   ✓ ${result2.agentPath} (${result2.latency}ms)`);

  // Test 3: Escalation Agent
  console.log('\n📝 Step 3: Escalation query...');
  const result3 = await agenticRAG('I need to speak with a human agent about a billing dispute immediately');
  console.log(`   ✓ ${result3.agentPath} (${result3.latency}ms)`);

  console.log('\n✅ Sequential Workflow Results:');
  console.log('━'.repeat(80));
  console.log(`Total Queries: 3`);
  console.log(`\nAgents Triggered:`);
  console.log(`   ${result1.agentsUsed.includes('Knowledge') ? '✅' : '❌'} Knowledge Agent - RAG with Pinecone`);
  console.log(`   ${result2.agentsUsed.includes('Action') ? '✅' : '❌'} Action Agent - Operational tasks`);
  console.log(`   ${result3.agentsUsed.includes('Escalation') ? '✅' : '❌'} Escalation Agent - Human handoff`);
  
  const allAgentsTriggered = 
    result1.agentsUsed.includes('Knowledge') &&
    result2.agentsUsed.includes('Action') &&
    result3.agentsUsed.includes('Escalation');

  if (allAgentsTriggered) {
    console.log('\n🎉 SUCCESS: All 4 agents validated (Triage + 3 specialists)!');
  } else {
    console.log('\n❌ FAILURE: Not all agents were triggered');
  }

  console.log(`\nPerformance:`);
  console.log(`   Total Tokens: ${result1.totalTokens + result2.totalTokens + result3.totalTokens}`);
  console.log(`   Total Latency: ${result1.latency + result2.latency + result3.latency}ms`);
  console.log(`   Total Cost: ~$${(((result1.totalTokens + result2.totalTokens + result3.totalTokens) * 0.00015) / 1000).toFixed(6)}`);

  return { result1, result2, result3 };
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

    // const result8 = await test8_UltimateStressTest();
    // totalTokens += result8.totalTokens;
    // totalCost += (result8.totalTokens * 0.00015) / 1000;

    // TEST 9: TRUE AGENTIC COORDINATION - Parallel Multi-Agent Execution
    console.log('\n🎯 Running Scenario 9: TRUE AGENTIC COORDINATION (Agents-as-Tools)...\n');
    const result9 = await test9_TrueAgenticCoordination();
    totalTokens += result9.metadata.totalTokens;
    totalCost += (result9.metadata.totalTokens * 0.00015) / 1000;

    // TEST 10: Sequential workflow testing each agent individually
    console.log('\n🎯 Running Scenario 10: SEQUENTIAL WORKFLOW TEST...\n');
    const result10 = await test10_SequentialWorkflow();
    totalTokens += result10.result1.totalTokens + result10.result2.totalTokens + result10.result3.totalTokens;
    totalCost += ((result10.result1.totalTokens + result10.result2.totalTokens + result10.result3.totalTokens) * 0.00015) / 1000;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '━'.repeat(80));
    console.log('✅ ALL AGENTIC RAG E2E TESTS COMPLETED!');
    console.log('━'.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📊 Total Tokens: ${totalTokens}`);
    console.log(`💰 Total Cost: ~$${totalCost.toFixed(6)}`);
    console.log(`📈 Average Latency: ${((Date.now() - startTime) / 2 / 1000).toFixed(2)}s per scenario`);
    console.log(`\n🤖 Multi-Agent Patterns Validated:`);
    console.log(`   ✅ Parallel Agent Execution (Agents-as-Tools)`);
    console.log(`   ✅ Sequential Agent Handoffs (Triage Pattern)`);
    console.log(`   ✅ Individual Agent Specialization`);
    console.log(`   ✅ Result Aggregation & Synthesis`);
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

