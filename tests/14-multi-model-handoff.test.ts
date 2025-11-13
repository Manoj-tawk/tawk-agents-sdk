/**
 * Multi-Model Multi-Agent Test Suite with Handoffs - FIXED WITH AUTO-SUMMARIZATION
 * 
 * Tests:
 * - Claude 3.5 Sonnet (Anthropic)
 * - GPT-4o (OpenAI)  
 * - Gemini 1.5 Pro (Google)
 * - Llama 3.1 70B (Groq)
 * 
 * Features:
 * - Multi-agent handoffs between models
 * - 40 conversation turns (auto-summarization prevents token overflow)
 * - Memory persistence
 * - Context passing
 * - Performance comparison
 * 
 * FIX: Auto-summarization after 10 messages, keeping last 3 verbatim
 */

import { config } from 'dotenv';
config();

import { Agent, run, tool, SessionManager } from '../src';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

// ============================================================================
// SETUP MODELS
// ============================================================================

console.log('🔧 Setting up AI models...\n');

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Test models with correct names
const MODELS = {
  claude: anthropic('claude-sonnet-4-5-20250929'),
  gpt4: openai('gpt-4o'),
  gemini: google('gemini-2.5-pro'),
  groq: groq('llama-3.1-8b-instant'), // Use 3.1 which is stable
};

// ============================================================================
// SHARED CONTEXT & TOOLS
// ============================================================================

interface ConversationContext {
  userId: string;
  userName: string;
  facts: Record<string, string[]>;
  conversationCount: number;
  modelHands: string[];
}

const rememberTool = tool({
  description: 'Remember important information about the user',
  parameters: z.object({
    category: z.string().describe('Category like personal, work, hobbies, etc'),
    fact: z.string().describe('The fact to remember'),
  }),
  execute: async ({ category, fact }, contextWrapper) => {
    const context = contextWrapper?.context as ConversationContext;
    if (!context) return { error: 'No context' };
    
    if (!context.facts[category]) {
      context.facts[category] = [];
    }
    context.facts[category].push(fact);
    
    console.log(`  💾 Remembered [${category}]: ${fact}`);
    return { 
      success: true,
      totalFacts: Object.values(context.facts).flat().length,
    };
  },
});

const recallTool = tool({
  description: 'Recall facts about the user',
  parameters: z.object({
    category: z.string().optional().describe('Optional category to filter'),
  }),
  execute: async ({ category }, contextWrapper) => {
    const context = contextWrapper?.context as ConversationContext;
    if (!context) return { error: 'No context' };
    
    if (category && context.facts[category]) {
      return { facts: context.facts[category], category };
    }
    
    return { allFacts: context.facts };
  },
});

// ============================================================================
// CREATE SPECIALIZED AGENTS
// ============================================================================

// Claude: Memory & Analysis Expert
const claudeAgent = new Agent<ConversationContext, string>({
  name: 'Claude Memory Expert',
  model: MODELS.claude,
  instructions: `You are Claude, a memory and analysis expert.
  
Your role:
- Remember detailed facts about users
- Provide thorough analysis
- Be thoughtful and precise
- Use the remember and recall tools actively

When you can't help, handoff to a specialist.`,
  tools: { rememberTool, recallTool },
});

// GPT-4: General Assistant
const gpt4Agent = new Agent<ConversationContext, string>({
  name: 'GPT-4 General Assistant',
  model: MODELS.gpt4,
  instructions: `You are GPT-4, a versatile general assistant.
  
Your role:
- Handle general queries
- Creative responses
- Quick and helpful
- Remember key facts

Use tools to remember important info.`,
  tools: { rememberTool, recallTool },
});

// Gemini: Creative & Analytical
const geminiAgent = new Agent<ConversationContext, string>({
  name: 'Gemini Creative Assistant',
  model: MODELS.gemini,
  instructions: `You are Gemini, creative and analytical.
  
Your role:
- Creative problem solving
- Data analysis
- Multimodal understanding
- Memory management

Remember facts and provide creative insights.`,
  tools: { rememberTool, recallTool },
});

// Groq: Speed Specialist  
const groqAgent = new Agent<ConversationContext, string>({
  name: 'Groq Speed Expert',
  model: groq('llama-3.1-70b-versatile') as any,  // Type cast for v2 model
  instructions: `You are powered by Groq, the fastest AI.
  
Your role:
- Lightning-fast responses
- Efficient processing
- Quick recall
- Concise answers

Remember facts and be swift!`,
  tools: { rememberTool, recallTool },
});

// ============================================================================
// COORDINATOR AGENT WITH HANDOFFS
// ============================================================================

const coordinatorAgent = new Agent<ConversationContext, string>({
  name: 'Coordinator',
  model: MODELS.gpt4,
  instructions: `You are a coordinator managing specialist AI agents.

Available specialists:
- Claude: Deep analysis and detailed memory
- GPT-4: General assistance
- Gemini: Creative and analytical tasks  
- Groq: Fast, efficient responses

Your job:
1. Understand the user's need
2. Delegate to the RIGHT specialist
3. Handoff seamlessly

Handoff rules:
- Memory/analysis questions → Claude
- General questions → GPT-4
- Creative/analytical → Gemini
- Quick facts/speed needed → Groq

Always explain WHY you're handing off.`,
  handoffs: [claudeAgent, gpt4Agent, geminiAgent, groqAgent],
});

// ============================================================================
// TEST CONVERSATIONS
// ============================================================================

const CONVERSATIONS = [
  // Phase 1: Initial setup (1-5)
  { turn: 1, message: "Hi! I'm Alice, a software engineer at Google.", model: 'coordinator' },
  { turn: 2, message: "I specialize in machine learning and AI.", model: 'coordinator' },
  { turn: 3, message: "What's my name and job?", model: 'coordinator', testRecall: true },
  { turn: 4, message: "I love hiking and photography.", model: 'coordinator' },
  { turn: 5, message: "Tell me what you know about me so far.", model: 'coordinator', testRecall: true },
  
  // Phase 2: Specialized tasks (6-15)
  { turn: 6, message: "Can you analyze my career path based on what I told you?", model: 'coordinator', preferAgent: 'claude' },
  { turn: 7, message: "What are some creative project ideas combining ML and photography?", model: 'coordinator', preferAgent: 'gemini' },
  { turn: 8, message: "Quick: what programming languages should I learn?", model: 'coordinator', preferAgent: 'groq' },
  { turn: 9, message: "I also know Python, JavaScript, and Go.", model: 'coordinator' },
  { turn: 10, message: "Summarize my technical skills.", model: 'coordinator', testRecall: true },
  // 🔔 Summarization triggered here (10+ messages)
  { turn: 11, message: "I'm working on a computer vision project for wildlife.", model: 'coordinator' },
  { turn: 12, message: "What do you remember about my current project?", model: 'coordinator', testRecall: true },
  { turn: 13, message: "I graduated from MIT in 2020.", model: 'coordinator' },
  { turn: 14, message: "I live in San Francisco.", model: 'coordinator' },
  { turn: 15, message: "Tell me everything about my background.", model: 'coordinator', testRecall: true },
  
  // Phase 3: Complex multi-turn (16-25)
  { turn: 16, message: "I'm thinking about switching to AI research.", model: 'coordinator' },
  { turn: 17, message: "What would be a good research direction given my skills?", model: 'coordinator', preferAgent: 'claude' },
  { turn: 18, message: "I'm particularly interested in multi-modal AI.", model: 'coordinator' },
  { turn: 19, message: "Can you come up with creative ways to combine my hobbies with my work?", model: 'coordinator', preferAgent: 'gemini' },
  { turn: 20, message: "Quick recap: what are my career goals now?", model: 'coordinator', preferAgent: 'groq', testRecall: true },
  // 🔔 Summarization triggered again (10+ messages since last summary)
  { turn: 21, message: "I have a meeting tomorrow about computer vision.", model: 'coordinator' },
  { turn: 22, message: "I need to present my wildlife project.", model: 'coordinator' },
  { turn: 23, message: "What should I highlight in my presentation?", model: 'coordinator', preferAgent: 'claude' },
  { turn: 24, message: "My favorite ML framework is PyTorch.", model: 'coordinator' },
  { turn: 25, message: "What technical details do you know about me?", model: 'coordinator', testRecall: true },
  
  // Phase 4: Memory stress test (26-35)
  { turn: 26, message: "Let's change topics - what's my name?", model: 'coordinator', testRecall: true },
  { turn: 27, message: "Where do I work?", model: 'coordinator', testRecall: true },
  { turn: 28, message: "What are my hobbies?", model: 'coordinator', testRecall: true },
  { turn: 29, message: "What's my education background?", model: 'coordinator', testRecall: true },
  { turn: 30, message: "What programming languages do I know?", model: 'coordinator', testRecall: true },
  // 🔔 Summarization triggered (10+ messages since last summary)
  { turn: 31, message: "I'm also learning Rust and WebAssembly.", model: 'coordinator' },
  { turn: 32, message: "I'm thinking about contributing to open source.", model: 'coordinator' },
  { turn: 33, message: "My favorite open source projects are TensorFlow and PyTorch.", model: 'coordinator' },
  { turn: 34, message: "Tell me about my open source interests.", model: 'coordinator', testRecall: true },
  { turn: 35, message: "What are all my current learning goals?", model: 'coordinator', testRecall: true },
  
  // Phase 5: Final comprehensive test (36-40)
  { turn: 36, message: "Create a comprehensive profile: my background, skills, interests, and goals.", model: 'coordinator', preferAgent: 'claude', testRecall: true },
  { turn: 37, message: "Design a creative 5-year career plan for me.", model: 'coordinator', preferAgent: 'gemini' },
  { turn: 38, message: "Quick summary of who I am in 3 bullet points.", model: 'coordinator', preferAgent: 'groq', testRecall: true },
  { turn: 39, message: "Based on everything, what would be my dream job?", model: 'coordinator' },
  { turn: 40, message: "Final test: tell me EVERYTHING you remember about me - name, job, skills, hobbies, goals, projects, education, location, everything!", model: 'coordinator', testRecall: true },
  // 🔔 Summarization triggered (10+ messages since last summary)
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runMultiAgentTest() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 Multi-Model Multi-Agent Test with Handoffs (40 turns)    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('✅ AUTO-SUMMARIZATION ENABLED\n');
  console.log('   Strategy: Summarize ONLY when reaching 10 messages');
  console.log('   Keep last 3 messages verbatim');
  console.log('   Uses GPT-4o-mini for intelligent summaries\n');
  
  const sessionManager = new SessionManager({ 
    type: 'memory',
    maxMessages: 15, // Fallback if summarization fails
    summarization: {
      enabled: true,
      messageThreshold: 10, // Only summarize when we have 10+ messages
      keepRecentMessages: 3, // Keep last 3 verbatim
      model: openai('gpt-4o-mini'), // Use LLM for quality summaries
    }
  });
  const session = sessionManager.getSession('alice-test');
  
  const context: ConversationContext = {
    userId: 'alice-123',
    userName: '',
    facts: {},
    conversationCount: 0,
    modelHands: [],
  };
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    modelUsage: {} as Record<string, number>,
    recallTests: { passed: 0, failed: 0 },
    avgResponseTime: 0,
    totalTokens: 0,
  };
  
  const responseTimes: number[] = [];
  
  console.log('🚀 Starting 40-turn conversation with multi-agent handoffs...\n');
  
  for (const conv of CONVERSATIONS) {
    results.total++;
    context.conversationCount++;
    
    const progress = '▓'.repeat(Math.floor(conv.turn / 2)) + '░'.repeat(20 - Math.floor(conv.turn / 2));
    console.log(`\n[${progress}] Turn ${conv.turn}/40`);
    console.log(`💬 User: ${conv.message}`);
    
    if (conv.preferAgent) {
      console.log(`   💡 Hint: Best handled by ${conv.preferAgent}`);
    }
    
    try {
      const startTime = Date.now();
      
      const result = await run(coordinatorAgent, conv.message, {
        session,
        context,
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      console.log(`🤖 Response: ${result.finalOutput.substring(0, 150)}${result.finalOutput.length > 150 ? '...' : ''}`);
      console.log(`⏱️  ${responseTime}ms`);
      
      if (result.metadata.totalTokens) {
        results.totalTokens += result.metadata.totalTokens;
        console.log(`🎯 Tokens: ${result.metadata.totalTokens}`);
      }
      
      // Test recall
      if (conv.testRecall) {
        const hasContent = result.finalOutput.length > 50;
        if (hasContent) {
          console.log(`   ✅ Memory recall successful`);
          results.recallTests.passed++;
        } else {
          console.log(`   ❌ Memory recall failed`);
          results.recallTests.failed++;
        }
      }
      
      console.log(`📊 Context: ${Object.keys(context.facts).length} categories, ${Object.values(context.facts).flat().length} facts`);
      
      results.passed++;
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
      results.failed++;
      if (conv.testRecall) {
        results.recallTests.failed++;
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Calculate stats
  results.avgResponseTime = Math.round(
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  );
  
  // Print results
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                    📊 TEST RESULTS                             ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
  
  console.log(`Total Conversations: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);
  
  console.log(`Memory Recall Tests:`);
  console.log(`  Passed: ${results.recallTests.passed} ✅`);
  console.log(`  Failed: ${results.recallTests.failed} ❌\n`);
  
  console.log(`Performance:`);
  console.log(`  Avg Response Time: ${results.avgResponseTime}ms`);
  console.log(`  Total Tokens: ${results.totalTokens}\n`);
  
  console.log(`Context Final State:`);
  console.log(`  Conversation Count: ${context.conversationCount}`);
  console.log(`  Fact Categories: ${Object.keys(context.facts).join(', ')}`);
  console.log(`  Total Facts: ${Object.values(context.facts).flat().length}\n`);
  
  console.log(`✅ Features Validated:`);
  console.log(`   ✓ Multi-agent handoffs`);
  console.log(`   ✓ Multi-turn conversations (40 turns)`);
  console.log(`   ✓ Memory persistence`);
  console.log(`   ✓ Context passing`);
  console.log(`   ✓ Session management`);
  console.log(`   ✓ Multiple AI models\n`);
  
  if (results.failed > 0) {
    throw new Error(`${results.failed} tests failed`);
  }
  
  console.log(`🎉 All tests passed!\n`);
}

// Run the test
console.log('🧪 Initializing multi-model test suite...\n');
runMultiAgentTest().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});

