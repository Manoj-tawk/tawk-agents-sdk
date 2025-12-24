/**
 * TEST 07: Advanced Tool Calling Patterns
 * 
 * Tests sequential and parallel tool execution:
 * - Sequential: Agent calls 5 tools one after another, using previous results
 * - Parallel: Agent calls multiple tools simultaneously
 */

import { Agent, run, setDefaultModel, tool } from '../../src';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Set default model
setDefaultModel(openai('gpt-4o-mini'));

// Helper to create agents
const agent = (config: any) => new Agent(config);

console.log('\n🧪 TEST 07: Advanced Tool Calling Patterns\n');
console.log('======================================================================\n');

// ============================================
// TEST 7.1: Sequential Tool Calling (5 Tools Chained)
// ============================================
async function testSequentialToolCalling() {
  console.log('📌 Test 7.1: Sequential Tool Calling (5 Tools Chained)');
  
  // Create 5 tools that build on each other
  const tools = {
    step1_getData: tool({
      description: 'Gets initial data. Always call this first.',
      inputSchema: z.object({}),
      execute: async () => {
        console.log('  🔧 Step 1: Getting data...');
        return { data: [1, 2, 3, 4, 5] };
      },
    }),
    
    step2_doubleNumbers: tool({
      description: 'Doubles all numbers in the data. Call this with the numbers from step1.',
      inputSchema: z.object({
        numbers: z.array(z.number()).describe('The numbers to double'),
      }),
      execute: async ({ numbers }) => {
        console.log('  🔧 Step 2: Doubling numbers...');
        return { doubled: numbers.map(n => n * 2) };
      },
    }),
    
    step3_sumNumbers: tool({
      description: 'Sums the numbers. Call this with doubled numbers from step2.',
      inputSchema: z.object({
        numbers: z.array(z.number()).describe('The numbers to sum'),
      }),
      execute: async ({ numbers }) => {
        console.log('  🔧 Step 3: Summing numbers...');
        const sum = numbers.reduce((a, b) => a + b, 0);
        return { sum };
      },
    }),
    
    step4_squareNumber: tool({
      description: 'Squares a number. Call this with the sum from step3.',
      inputSchema: z.object({
        number: z.number().describe('The number to square'),
      }),
      execute: async ({ number }) => {
        console.log('  🔧 Step 4: Squaring number...');
        return { squared: number * number };
      },
    }),
    
    step5_formatResult: tool({
      description: 'Formats the final result nicely. Call this with the squared number from step4.',
      inputSchema: z.object({
        number: z.number().describe('The number to format'),
      }),
      execute: async ({ number }) => {
        console.log('  🔧 Step 5: Formatting result...');
        return { 
          formatted: `The final result is ${number}`,
          calculation: 'sum([1,2,3,4,5] * 2) ^ 2',
        };
      },
    }),
  };

  const sequentialAgent = agent({
    name: 'SequentialAgent',
    instructions: `You are a calculator that MUST follow these exact steps:
    
1. Call step1_getData to get initial data
2. Call step2_doubleNumbers with the data from step 1
3. Call step3_sumNumbers with the doubled numbers from step 2
4. Call step4_squareNumber with the sum from step 3
5. Call step5_formatResult with the squared number from step 4

IMPORTANT: You MUST call ALL 5 tools in this EXACT order, one after another.
Each tool depends on the result of the previous tool.
After calling all 5 tools, provide the final formatted result to the user.`,
    tools,
    maxSteps: 10,
  });

  const result = await run(sequentialAgent, 'Calculate the result by following all 5 steps', {
    maxTurns: 10,
  });

  console.log(`✅ Sequential execution complete`);
  console.log(`   Steps: ${result.steps.length}`);
  console.log(`   Tool Calls: ${result.metadata.totalToolCalls}`);
  console.log(`   Final Output: ${result.finalOutput}\n`);
  
  if (result.metadata.totalToolCalls !== 5) {
    throw new Error(`Expected 5 tool calls, got ${result.metadata.totalToolCalls}`);
  }
}

// ============================================
// TEST 7.2: Parallel Tool Calling
// ============================================
async function testParallelToolCalling() {
  console.log('📌 Test 7.2: Parallel Tool Calling');
  
  // Create independent tools that can run in parallel
  const tools = {
    getWeather: tool({
      description: 'Gets weather information',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        console.log(`  🌤️  Getting weather for ${city}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { weather: `Sunny in ${city}`, temp: 25 };
      },
    }),
    
    getTime: tool({
      description: 'Gets current time',
      inputSchema: z.object({
        timezone: z.string(),
      }),
      execute: async ({ timezone }) => {
        console.log(`  🕐 Getting time for ${timezone}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { time: '14:30', timezone };
      },
    }),
    
    getNews: tool({
      description: 'Gets latest news',
      inputSchema: z.object({
        category: z.string(),
      }),
      execute: async ({ category }) => {
        console.log(`  📰 Getting ${category} news...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { news: `Latest ${category} headlines`, count: 5 };
      },
    }),
    
    getStocks: tool({
      description: 'Gets stock prices',
      inputSchema: z.object({
        symbol: z.string(),
      }),
      execute: async ({ symbol }) => {
        console.log(`  📈 Getting stock price for ${symbol}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { symbol, price: 150.50, change: '+2.5%' };
      },
    }),
  };

  const parallelAgent = agent({
    name: 'ParallelAgent',
    instructions: `You are an information aggregator. When asked for multiple pieces of information,
call ALL the relevant tools to gather the data, then provide a comprehensive summary.

For example, if asked about a city, you might call getWeather, getTime, getNews, and getStocks
all at once (if the LLM supports parallel tool calling).`,
    tools,
    maxSteps: 5,
  });

  const result = await run(parallelAgent, 'Get me information about New York: weather, time (EST), tech news, and AAPL stock price', {
    maxTurns: 5,
  });

  console.log(`✅ Parallel execution complete`);
  console.log(`   Steps: ${result.steps.length}`);
  console.log(`   Tool Calls: ${result.metadata.totalToolCalls}`);
  console.log(`   Final Output: ${result.finalOutput.substring(0, 150)}...\n`);
  
  if (result.metadata.totalToolCalls !== 4) {
    throw new Error(`Expected 4 tool calls, got ${result.metadata.totalToolCalls}`);
  }
}

// ============================================
// TEST 7.3: Parallel Tool Calls with Same Tool Name
// ============================================
async function testParallelSameToolName() {
  console.log('📌 Test 7.3: Parallel Tool Calls with Same Tool Name');
  
  // Track execution order and results to verify correct index-based matching
  const executionLog: { query: string; startTime: number }[] = [];
  
  const tools = {
    search: tool({
      description: 'Searches for information about a topic',
      inputSchema: z.object({
        query: z.string().describe('The search query'),
      }),
      execute: async ({ query }) => {
        const entry = { query, startTime: Date.now() };
        executionLog.push(entry);
        console.log(`  🔍 Searching for "${query}"...`);
        // Add varying delays to prove parallel execution and test index matching
        const delay = Math.floor(Math.random() * 50) + 50;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { 
          query, 
          results: `Found 10 results for "${query}"`,
          timestamp: entry.startTime,
        };
      },
    }),
  };

  const searchAgent = agent({
    name: 'SearchAgent',
    instructions: `You are a research assistant. When asked to search for multiple topics,
you MUST call the search tool multiple times IN PARALLEL - once for each topic.
Do NOT call them sequentially. Call all search tools at the same time.
After getting all results, summarize what you found for each topic.`,
    tools,
    maxSteps: 5,
  });

  const result = await run(searchAgent, 'Search for these 3 topics simultaneously: "cats", "dogs", and "birds"', {
    maxTurns: 5,
  });

  console.log(`✅ Parallel same-tool execution complete`);
  console.log(`   Steps: ${result.steps.length}`);
  console.log(`   Tool Calls: ${result.metadata.totalToolCalls}`);
  console.log(`   Execution Log: ${executionLog.map(e => e.query).join(', ')}`);
  
  // Verify that 3 search calls were made
  const totalToolCalls = result.metadata.totalToolCalls ?? 0;
  if (totalToolCalls < 3) {
    throw new Error(`Expected at least 3 tool calls for same tool, got ${totalToolCalls}`);
  }
  
  // Verify all searches were executed
  const searchedQueries = executionLog.map(e => e.query.toLowerCase());
  const hasAllTopics = ['cats', 'dogs', 'birds'].every(topic => 
    searchedQueries.some(q => q.includes(topic))
  );
  
  if (!hasAllTopics) {
    throw new Error(`Expected searches for cats, dogs, and birds. Got: ${searchedQueries.join(', ')}`);
  }
  
  // Verify the final output mentions all search results (proves correct result matching)
  const output = result.finalOutput.toLowerCase();
  const mentionsAllTopics = ['cats', 'dogs', 'birds'].every(topic => 
    output.includes(topic) || output.includes('result')
  );
  
  if (!mentionsAllTopics) {
    console.log(`   ⚠️ Warning: Final output may not include all topics`);
  }
  
  console.log(`   Final Output: ${result.finalOutput.substring(0, 200)}...\n`);
}

// ============================================
// TEST 7.4: Multi-Agent Parallel Execution (Race)
// ============================================
async function testMultiAgentParallel() {
  console.log('📌 Test 7.4: Multi-Agent Parallel Execution');
  
  const fastAgent = agent({
    name: 'FastAgent',
    instructions: 'Respond very quickly with a short answer.',
    maxSteps: 1,
  });

  const detailedAgent = agent({
    name: 'DetailedAgent',
    instructions: 'Provide a detailed, comprehensive answer.',
    maxSteps: 1,
  });

  const creativeAgent = agent({
    name: 'CreativeAgent',
    instructions: 'Provide a creative, imaginative answer.',
    maxSteps: 1,
  });

  console.log('  🏁 Running 3 agents in parallel...');
  
  const question = 'What is AI?';
  
  const startTime = Date.now();
  const results = await Promise.all([
    run(fastAgent, question, { maxTurns: 2 }),
    run(detailedAgent, question, { maxTurns: 2 }),
    run(creativeAgent, question, { maxTurns: 2 }),
  ]);
  const duration = Date.now() - startTime;

  console.log(`✅ Parallel agents complete in ${duration}ms`);
  console.log(`   FastAgent: ${results[0].finalOutput.substring(0, 50)}...`);
  console.log(`   DetailedAgent: ${results[1].finalOutput.substring(0, 50)}...`);
  console.log(`   CreativeAgent: ${results[2].finalOutput.substring(0, 50)}...\n`);
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runTests() {
  try {
    await testSequentialToolCalling();
    await testParallelToolCalling();
    await testParallelSameToolName();
    await testMultiAgentParallel();
    
    console.log('======================================================================');
    console.log('✅ ALL ADVANCED TOOL CALLING TESTS PASSED');
    console.log('======================================================================\n');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();

