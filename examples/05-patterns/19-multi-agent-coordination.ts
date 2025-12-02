/**
 * Multi-Agent Coordination Demo
 * 
 * Shows agents working TOGETHER to solve a complex task:
 * - Researcher gathers data
 * - Analyzer processes it
 * - Writer creates report
 * - Reviewer provides feedback
 * - Writer revises based on feedback
 * 
 * Real coordination with back-and-forth transfers!
 */

import { Agent, run, setDefaultModel } from '../src/index';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { MemorySession } from '../src/sessions';
import 'dotenv/config';

setDefaultModel(openai('gpt-4o-mini'));

// ============================================
// 1. RESEARCH AGENT - Gathers information
// ============================================

const researchAgent = new Agent({
  name: 'Researcher',
  instructions: `
You are a research agent. Your job is to gather information on topics.

When given a research request:
1. Use the search tool to find information
2. Use the fetch tool to get details
3. Compile findings into structured data
4. Transfer to Analyzer with your research

Be thorough and cite sources.
  `,
  
  tools: {
    search: {
      description: 'Search for information on a topic',
      inputSchema: z.object({ 
        query: z.string(),
        numResults: z.number().default(3)
      }),
      execute: async ({ query, numResults }) => {
        // Simulate search results
        const topics: Record<string, any> = {
          'ai agent architectures': {
            results: [
              { title: 'ReAct Pattern', summary: 'Reasoning + Acting in language models', relevance: 0.95 },
              { title: 'AutoGPT Architecture', summary: 'Autonomous agent with memory and planning', relevance: 0.90 },
              { title: 'LangChain Agents', summary: 'Framework for LLM-powered autonomous agents', relevance: 0.88 }
            ]
          },
          'rag implementation': {
            results: [
              { title: 'Vector Databases', summary: 'Pinecone, Weaviate for semantic search', relevance: 0.92 },
              { title: 'Embedding Models', summary: 'OpenAI, Cohere embeddings comparison', relevance: 0.85 },
              { title: 'RAG Optimization', summary: 'Chunking strategies and retrieval tuning', relevance: 0.80 }
            ]
          }
        };
        
        const key = Object.keys(topics).find(k => query.toLowerCase().includes(k)) || 'ai agent architectures';
        return topics[key];
      }
    },
    
    fetch: {
      description: 'Fetch detailed information about a specific topic',
      inputSchema: z.object({ topic: z.string() }),
      execute: async ({ topic }) => {
        // Simulate fetching details
        return {
          topic,
          details: `Detailed information about ${topic}: Key concepts, implementation patterns, best practices, and recent developments.`,
          sources: ['Source 1', 'Source 2', 'Source 3'],
          lastUpdated: new Date().toISOString()
        };
      }
    }
  },
  
  subagents: [] // Will set below
});

// ============================================
// 2. ANALYZER AGENT - Processes data
// ============================================

const analyzerAgent = new Agent({
  name: 'Analyzer',
  instructions: `
You are an analysis agent. You process research data and extract insights.

When you receive research data:
1. Use the analyze tool to process the data
2. Identify key patterns and insights
3. Create a structured analysis
4. Transfer to Writer with your analysis

Be analytical and insightful.
  `,
  
  tools: {
    analyze: {
      description: 'Analyze research data and extract insights',
      inputSchema: z.object({ 
        data: z.string(),
        focusArea: z.string().optional()
      }),
      execute: async ({ data, focusArea }) => {
        // Simulate analysis
        return {
          insights: [
            'Key pattern 1: Multi-agent systems show 40% better performance',
            'Key pattern 2: Context isolation improves reliability',
            'Key pattern 3: Parallel execution reduces latency by 60%'
          ],
          trends: ['Growing adoption', 'Focus on observability', 'Cost optimization'],
          recommendations: ['Use specialized agents', 'Implement proper tracing', 'Optimize token usage'],
          confidence: 0.85
        };
      }
    },
    
    compare: {
      description: 'Compare different approaches or solutions',
      inputSchema: z.object({ items: z.array(z.string()) }),
      execute: async ({ items }) => {
        return {
          comparison: items.map(item => ({
            name: item,
            pros: ['Pro 1', 'Pro 2'],
            cons: ['Con 1'],
            score: Math.random() * 10
          })),
          winner: items[0],
          reasoning: 'Based on performance, reliability, and ease of use'
        };
      }
    }
  },
  
  subagents: [] // Will set below
});

// ============================================
// 3. WRITER AGENT - Creates content
// ============================================

const writerAgent = new Agent({
  name: 'Writer',
  instructions: `
You are a content writer agent. You create well-structured reports.

When you receive analysis:
1. Use the draft tool to create initial content
2. Structure it logically with clear sections
3. Transfer to Reviewer for feedback
4. If you receive feedback, revise and improve
5. When approved, return final output

Write clearly and professionally.
  `,
  
  tools: {
    draft: {
      description: 'Create a draft document',
      inputSchema: z.object({ 
        title: z.string(),
        sections: z.array(z.object({
          heading: z.string(),
          content: z.string()
        }))
      }),
      execute: async ({ title, sections }) => {
        return {
          document: {
            title,
            sections,
            wordCount: sections.reduce((sum, s) => sum + s.content.split(' ').length, 0),
            status: 'draft'
          },
          createdAt: new Date().toISOString()
        };
      }
    },
    
    revise: {
      description: 'Revise content based on feedback',
      inputSchema: z.object({ 
        content: z.string(),
        feedback: z.string()
      }),
      execute: async ({ content, feedback }) => {
        return {
          revisedContent: `${content}\n\n[REVISED based on: ${feedback}]`,
          improvements: ['Added more detail', 'Improved clarity', 'Fixed issues'],
          version: 2
        };
      }
    }
  },
  
  subagents: [] // Will set below
});

// ============================================
// 4. REVIEWER AGENT - Provides feedback
// ============================================

const reviewerAgent = new Agent({
  name: 'Reviewer',
  instructions: `
You are a quality reviewer agent. You evaluate content and provide feedback.

When you receive a draft:
1. Use the review tool to evaluate quality
2. Check for completeness, accuracy, and clarity
3. Decide if it needs revision or is ready
4. If needs revision: Transfer back to Writer with feedback
5. If ready: Approve and transfer to Coordinator for final output

Be constructive and thorough.
  `,
  
  tools: {
    review: {
      description: 'Review content quality',
      inputSchema: z.object({ 
        content: z.string(),
        criteria: z.array(z.string()).optional()
      }),
      execute: async ({ content, criteria }) => {
        // Simulate review
        const score = Math.random() * 100;
        return {
          overallScore: score,
          needsRevision: score < 75,
          feedback: score < 75 
            ? 'Needs more detail in the analysis section and better examples'
            : 'Excellent work! Ready for publication',
          strengths: ['Clear structure', 'Good insights'],
          improvements: score < 75 ? ['Add more examples', 'Expand analysis'] : [],
          approved: score >= 75
        };
      }
    }
  },
  
  subagents: [] // Will set below
});

// ============================================
// 5. COORDINATOR AGENT - Orchestrates workflow
// ============================================

const coordinatorAgent = new Agent({
  name: 'Coordinator',
  instructions: `
You are the coordinator agent. You manage the workflow.

When you receive a user request:
1. Transfer to Researcher to gather information
2. Once research is done, flow continues through Analyzer → Writer → Reviewer
3. If Reviewer sends back for revision, Writer will handle it
4. When final approved content comes back, format and return to user

You orchestrate the entire process.
  `,
  
  subagents: [] // Will set below
});

// ============================================
// SET UP AGENT RELATIONSHIPS (Bidirectional)
// ============================================

// Coordinator can transfer to Researcher
coordinatorAgent.subagents = [researchAgent];

// Researcher can transfer to Analyzer
researchAgent.subagents = [analyzerAgent];

// Analyzer can transfer to Writer
analyzerAgent.subagents = [writerAgent];

// Writer can transfer to Reviewer
writerAgent.subagents = [reviewerAgent];

// Reviewer can transfer back to Writer (for revision) or to Coordinator (when done)
reviewerAgent.subagents = [writerAgent, coordinatorAgent];

// ============================================
// TEST FUNCTION
// ============================================

async function testCoordination() {
  console.log('🎭 MULTI-AGENT COORDINATION DEMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Task: Research AI agent architectures and create a report\n');
  console.log('🔄 Expected Flow:');
  console.log('   Coordinator → Researcher → Analyzer → Writer → Reviewer');
  console.log('   (Reviewer may send back to Writer for revision)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const session = new MemorySession('coordination-test');
  
  const result = await run(
    coordinatorAgent,
    'Create a comprehensive report on AI agent architectures, including analysis of different patterns and their tradeoffs',
    {
      session,
      maxTurns: 30, // Allow many turns for coordination
      context: {
        reportFormat: 'professional',
        detailLevel: 'comprehensive'
      }
    }
  );
  
  console.log('\n\n📊 COORDINATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔄 Agent Transfer Chain:');
  if (result.metadata.handoffChain && result.metadata.handoffChain.length > 0) {
    console.log('   ' + result.metadata.handoffChain.join(' → '));
  } else {
    console.log('   Only Coordinator (no transfers happened)');
  }
  
  console.log('\n🤖 Agents Involved:', result.metadata.agentMetrics?.length || 1);
  result.metadata.agentMetrics?.forEach(metric => {
    console.log(`   ✓ ${metric.agentName}: ${metric.turns} turn(s)`);
  });
  
  console.log('\n🔧 Tools Used:', result.metadata.totalToolCalls);
  console.log('💰 Total Tokens:', result.metadata.totalTokens);
  console.log('⏱️  Total Turns:', result.steps.length);
  
  console.log('\n📝 Final Output (truncated):');
  const output = typeof result.finalOutput === 'string' 
    ? result.finalOutput 
    : JSON.stringify(result.finalOutput, null, 2);
  console.log('   ' + output.substring(0, 500) + '...');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Show detailed step-by-step coordination
  console.log('📋 STEP-BY-STEP COORDINATION:\n');
  result.steps.forEach((step, i) => {
    console.log(`Step ${i + 1}:`);
    console.log(`  Agent: ${step.agent || 'Unknown'}`);
    console.log(`  Tool Calls: ${step.toolCalls?.length || 0}`);
    if (step.toolCalls && step.toolCalls.length > 0) {
      step.toolCalls.forEach(tc => {
        console.log(`    - ${tc.toolName}`);
      });
    }
    console.log();
  });
  
  return result;
}

// ============================================
// RUN TEST
// ============================================

if (require.main === module) {
  testCoordination()
    .then(() => {
      console.log('✅ Multi-agent coordination test completed!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { 
  coordinatorAgent, 
  researchAgent, 
  analyzerAgent, 
  writerAgent, 
  reviewerAgent,
  testCoordination 
};

