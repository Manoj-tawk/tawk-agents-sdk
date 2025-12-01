/**
 * Manual Test: Multi-Agent Execution
 * 
 * This test validates multi-agent handoffs and coordination.
 * 
 * Run: npx tsx tests/manual/test-multi-agent.ts
 */

import 'dotenv/config';
import { Agent, run, tool } from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

console.log('🧪 Testing Multi-Agent Execution\n');

// Tools for Data Agent
const fetchData = tool({
  description: 'Fetch data from database',
  inputSchema: z.object({
    id: z.string(),
  }),
  execute: async ({ id }) => {
    console.log(`  📊 Fetching data for ID: ${id}`);
    return {
      id,
      data: 'Sample data content',
      timestamp: Date.now(),
    };
  },
});

// Tools for Analysis Agent
const analyzeData = tool({
  description: 'Analyze the provided data',
  inputSchema: z.object({
    data: z.string(),
  }),
  execute: async ({ data }) => {
    console.log(`  🔍 Analyzing data: ${data}`);
    return {
      analysis: 'Data analysis complete',
      insights: ['Pattern A detected', 'Pattern B detected'],
      confidence: 0.95,
    };
  },
});

// Tools for Report Agent
const generateReport = tool({
  description: 'Generate a formatted report',
  inputSchema: z.object({
    analysis: z.string(),
  }),
  execute: async ({ analysis }) => {
    console.log(`  📝 Generating report from analysis`);
    return {
      report: `REPORT: ${analysis}`,
      format: 'PDF',
      pages: 5,
    };
  },
});

async function testAgentHandoffs() {
  console.log('━'.repeat(80));
  console.log('TEST 1: Multi-Agent Handoffs (Linear)');
  console.log('━'.repeat(80));
  console.log('Flow: Coordinator → Data Agent → Analysis Agent → Report Agent');
  console.log('');

  // Create specialist agents
  const dataAgent = new Agent({
    name: 'DataAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'You are a data specialist. Fetch data when requested.',
    tools: {
      fetchData,
    },
  });

  const analysisAgent = new Agent({
    name: 'AnalysisAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'You are an analysis specialist. Analyze data when provided.',
    tools: {
      analyzeData,
    },
  });

  const reportAgent = new Agent({
    name: 'ReportAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'You are a reporting specialist. Generate reports from analysis.',
    tools: {
      generateReport,
    },
  });

  // Coordinator that can hand off to specialists
  const coordinator = new Agent({
    name: 'Coordinator',
    model: openai('gpt-4o-mini'),
    instructions: `You are a coordinator that delegates tasks to specialists:
    - Hand off to DataAgent for data fetching
    - Hand off to AnalysisAgent for data analysis
    - Hand off to ReportAgent for report generation
    
    Process: First get data, then analyze it, then generate a report.`,
    handoffs: [dataAgent, analysisAgent, reportAgent],
  });

  console.log('📝 Starting multi-agent execution...\n');
  const start = Date.now();

  const result = await run(
    coordinator,
    'I need a complete analysis report. First fetch data for ID "user-123", then analyze it, and finally generate a report.'
  );

  const duration = Date.now() - start;

  console.log('\n' + '━'.repeat(80));
  console.log('RESULTS:');
  console.log('━'.repeat(80));
  console.log(`Total execution time: ${duration}ms`);
  console.log(`Handoff chain: ${result.metadata.handoffChain?.join(' → ') || 'None'}`);
  console.log('');
  console.log('Final output:', result.finalOutput?.substring(0, 200) + '...');
  console.log('');

  // Validate handoffs occurred
  if (result.metadata.handoffChain && result.metadata.handoffChain.length > 0) {
    console.log('✅ SUCCESS: Multi-agent handoffs working');
    console.log(`   Agents involved: ${result.metadata.handoffChain.length + 1}`);
  } else {
    console.log('❌ FAILURE: No handoffs detected');
  }
  console.log('');
}

async function testAgentCoordination() {
  console.log('━'.repeat(80));
  console.log('TEST 2: Multi-Agent Coordination (Parallel)');
  console.log('━'.repeat(80));
  console.log('Multiple agents working on different aspects simultaneously');
  console.log('');

  // Create specialist agents for parallel work
  const researchAgent = new Agent({
    name: 'ResearchAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'Research the topic and provide insights.',
    tools: {
      fetchData,
    },
  });

  const analysisAgent = new Agent({
    name: 'AnalysisAgent',
    model: openai('gpt-4o-mini'),
    instructions: 'Analyze data patterns and trends.',
    tools: {
      analyzeData,
    },
  });

  // Coordinator that can work with multiple agents
  const coordinator = new Agent({
    name: 'ParallelCoordinator',
    model: openai('gpt-4o-mini'),
    instructions: `You coordinate multiple specialist agents.
    You can hand off to ResearchAgent or AnalysisAgent as needed.`,
    handoffs: [researchAgent, analysisAgent],
  });

  console.log('📝 Starting parallel coordination...\n');
  const start = Date.now();

  const result = await run(
    coordinator,
    'I need both research and analysis. Get research data and perform analysis.'
  );

  const duration = Date.now() - start;

  console.log('\n' + '━'.repeat(80));
  console.log('RESULTS:');
  console.log('━'.repeat(80));
  console.log(`Total execution time: ${duration}ms`);
  console.log(`Agent metrics: ${result.metadata.agentMetrics?.length || 0} agents used`);
  console.log('');
  console.log('Final output:', result.finalOutput?.substring(0, 200) + '...');
  console.log('');
}

async function testNestedAgents() {
  console.log('━'.repeat(80));
  console.log('TEST 3: Nested Agent Execution');
  console.log('━'.repeat(80));
  console.log('Agent A → Agent B → Agent C (deep nesting)');
  console.log('');

  const agentC = new Agent({
    name: 'AgentC',
    model: openai('gpt-4o-mini'),
    instructions: 'You are the final specialist. Generate a report.',
    tools: {
      generateReport,
    },
  });

  const agentB = new Agent({
    name: 'AgentB',
    model: openai('gpt-4o-mini'),
    instructions: 'You analyze data and can hand off to AgentC for reports.',
    tools: {
      analyzeData,
    },
    handoffs: [agentC],
  });

  const agentA = new Agent({
    name: 'AgentA',
    model: openai('gpt-4o-mini'),
    instructions: 'You fetch data and can hand off to AgentB for analysis.',
    tools: {
      fetchData,
    },
    handoffs: [agentB],
  });

  console.log('📝 Starting nested execution...\n');
  const start = Date.now();

  const result = await run(
    agentA,
    'Fetch data for "test-456", analyze it, and generate a report. Complete the full pipeline.'
  );

  const duration = Date.now() - start;

  console.log('\n' + '━'.repeat(80));
  console.log('RESULTS:');
  console.log('━'.repeat(80));
  console.log(`Total execution time: ${duration}ms`);
  console.log(`Handoff chain: ${result.metadata.handoffChain?.join(' → ') || 'None'}`);
  console.log(`Total agents: ${(result.metadata.handoffChain?.length || 0) + 1}`);
  console.log('');

  if (result.metadata.handoffChain && result.metadata.handoffChain.length >= 2) {
    console.log('✅ SUCCESS: Nested agent handoffs working');
    console.log(`   Depth: ${result.metadata.handoffChain.length + 1} levels`);
  } else {
    console.log('⚠️  WARNING: Expected deeper nesting');
  }
  console.log('');
}

async function main() {
  try {
    console.log('🚀 MULTI-AGENT EXECUTION TEST\n');
    
    // Test 1: Linear handoffs
    await testAgentHandoffs();
    
    // Test 2: Parallel coordination
    await testAgentCoordination();
    
    // Test 3: Nested agents
    await testNestedAgents();

    console.log('━'.repeat(80));
    console.log('✅ All multi-agent tests completed!');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error);
    process.exit(1);
  }
}

main();
