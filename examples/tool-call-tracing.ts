/**
 * Tool Call Tracing Example with Langfuse
 * 
 * This example demonstrates how to enable automatic tool call tracing
 * using the built-in Langfuse integration.
 * 
 * Features:
 * - Automatic tool execution tracing
 * - Agent-level tracing
 * - Handoff tracing
 * - Guardrail tracing
 * - Full observability in Langfuse dashboard
 * 
 * Requirements:
 * - LANGFUSE_PUBLIC_KEY in .env
 * - LANGFUSE_SECRET_KEY in .env
 * - LANGFUSE_BASE_URL in .env (optional, defaults to cloud.langfuse.com)
 * - OPENAI_API_KEY in .env
 * 
 * @example
 * ```bash
 * # Set up Langfuse credentials
 * export LANGFUSE_PUBLIC_KEY="pk-lf-..."
 * export LANGFUSE_SECRET_KEY="sk-lf-..."
 * 
 * # Run the example
 * npx tsx examples/tool-call-tracing.ts
 * ```
 */

import 'dotenv/config';
import {
  Agent,
  run,
  tool,
  initializeLangfuse,
  isLangfuseEnabled,
  withTrace,
  withFunctionSpan,
} from '../dist/index';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

console.log('\n🔍 Tool Call Tracing with Langfuse Example\n');

// ============================================
// STEP 1: Initialize Langfuse
// ============================================

console.log('📋 Step 1: Initialize Langfuse\n');

// Initialize Langfuse (auto-initializes if env vars are present)
const langfuse = initializeLangfuse();

if (isLangfuseEnabled()) {
  console.log('✅ Langfuse tracing enabled');
  console.log('📊 View traces at: https://cloud.langfuse.com\n');
} else {
  console.log('⚠️  Langfuse not enabled. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable tracing');
  console.log('ℹ️  Continuing without tracing...\n');
}

// ============================================
// STEP 2: Define Tools with Automatic Tracing
// ============================================

console.log('📋 Step 2: Define Tools (Tracing Automatic)\n');

/**
 * Tool calls are automatically traced when Langfuse is enabled!
 * No extra code needed - the SDK handles it internally.
 */

const calculatorTool = tool({
  description: 'Perform mathematical calculations',
  inputSchema: z.object({
    expression: z.string().describe('Math expression like "2 + 2"'),
  }),
  execute: async ({ expression }) => {
    console.log(`   🔧 Tool called: calculator("${expression}")`);
    
    try {
      // Simple eval (safe for demo)
      const result = eval(expression);
      return { expression, result, success: true };
    } catch (error) {
      return { expression, error: String(error), success: false };
    }
  },
});

const weatherTool = tool({
  description: 'Get weather information for a city',
  inputSchema: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
  }),
  execute: async ({ city, units }) => {
    console.log(`   🔧 Tool called: getWeather("${city}", "${units}")`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      city,
      temperature: units === 'celsius' ? 22 : 72,
      condition: 'Sunny',
      humidity: 65,
      units,
    };
  },
});

const searchTool = tool({
  description: 'Search for information',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(5),
  }),
  execute: async ({ query, limit }) => {
    console.log(`   🔧 Tool called: search("${query}", limit: ${limit})`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      query,
      results: Array.from({ length: limit }, (_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://example.com/${i}`,
        snippet: `Information about ${query}`,
      })),
    };
  },
});

// ============================================
// STEP 3: Create Agent with Tools
// ============================================

console.log('📋 Step 3: Create Agent\n');

const agent = new Agent({
  name: 'ToolTracingAgent',
  instructions: `You are a helpful assistant with access to tools.
Use tools when needed to help users.
Always provide clear and accurate responses.`,
  model: openai('gpt-4o-mini'),
  modelSettings: {
    temperature: 0,
  },
  tools: {
    calculate: calculatorTool,
    getWeather: weatherTool,
    search: searchTool,
  },
});

console.log('✅ Agent created with 3 tools\n');

// ============================================
// STEP 4: Run Agent with Automatic Tracing
// ============================================

async function example1_BasicToolTracing() {
  console.log('━'.repeat(80));
  console.log('🧪 EXAMPLE 1: Basic Tool Call Tracing');
  console.log('━'.repeat(80) + '\n');

  console.log('Query: "What is 15 * 23?"\n');

  const result = await run(agent, 'What is 15 * 23?');

  console.log('\n✅ Result:', result.finalOutput);
  console.log('📊 Tool calls:', result.metadata.totalToolCalls || 0);
  console.log('🔍 Check Langfuse dashboard for detailed trace!\n');
}

async function example2_MultipleToolCalls() {
  console.log('━'.repeat(80));
  console.log('🧪 EXAMPLE 2: Multiple Tool Calls');
  console.log('━'.repeat(80) + '\n');

  console.log('Query: "What is the weather in Tokyo and what is 50 + 75?"\n');

  const result = await run(agent, 'What is the weather in Tokyo and what is 50 + 75?');

  console.log('\n✅ Result:', result.finalOutput);
  console.log('📊 Tool calls:', result.metadata.totalToolCalls || 0);
  console.log('🔍 Check Langfuse dashboard for multiple tool traces!\n');
}

async function example3_ComplexWorkflow() {
  console.log('━'.repeat(80));
  console.log('🧪 EXAMPLE 3: Complex Workflow with Multiple Tools');
  console.log('━'.repeat(80) + '\n');

  console.log('Query: "Search for AI agents, then calculate 100 * 5"\n');

  const result = await run(agent, 'Search for AI agents, then calculate 100 * 5');

  console.log('\n✅ Result:', result.finalOutput.substring(0, 200) + '...');
  console.log('📊 Tool calls:', result.metadata.totalToolCalls || 0);
  console.log('🔍 Check Langfuse dashboard for full workflow trace!\n');
}

// ============================================
// STEP 5: Manual Tool Tracing (Advanced)
// ============================================

async function example4_ManualToolTracing() {
  console.log('━'.repeat(80));
  console.log('🧪 EXAMPLE 4: Manual Tool Tracing with withFunctionSpan');
  console.log('━'.repeat(80) + '\n');

  // Manual tracing for custom tool execution
  await withTrace(
    {
      name: 'Manual Tool Execution',
      userId: 'user-123',
      sessionId: 'session-456',
    },
    async (trace) => {
      console.log('📝 Manually tracing tool execution...\n');

      // Trace a custom function
      const result1 = await withFunctionSpan(
        trace,
        'customCalculation',
        { operation: 'square', value: 25 },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 300));
          return { result: 25 * 25 };
        }
      );

      console.log('✅ Custom calculation result:', result1);

      // Trace another function
      const result2 = await withFunctionSpan(
        trace,
        'dataProcessing',
        { items: 10, operation: 'filter' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 400));
          return { processed: 10, filtered: 7 };
        }
      );

      console.log('✅ Data processing result:', result2);
      console.log('\n🔍 Check Langfuse for manual trace spans!\n');
    }
  );
}

// ============================================
// STEP 6: Multi-Agent with Tool Tracing
// ============================================

async function example5_MultiAgentToolTracing() {
  console.log('━'.repeat(80));
  console.log('🧪 EXAMPLE 5: Multi-Agent with Tool Call Tracing');
  console.log('━'.repeat(80) + '\n');

  // Specialist agent
  const mathAgent = new Agent({
    name: 'MathSpecialist',
    instructions: 'You are a math specialist. Use the calculator tool.',
    model: openai('gpt-4o-mini'),
    modelSettings: { temperature: 0 },
    tools: {
      calculate: calculatorTool,
    },
  });

  // Coordinator agent
  const coordinator = new Agent({
    name: 'Coordinator',
    instructions: 'Route math questions to the MathSpecialist.',
    model: openai('gpt-4o-mini'),
    modelSettings: { temperature: 0 },
    handoffs: [mathAgent],
  });

  console.log('Query: "Calculate 123 * 456"\n');

  const result = await run(coordinator, 'Calculate 123 * 456');

  console.log('\n✅ Result:', result.finalOutput);
  console.log('📊 Handoff chain:', result.metadata.handoffChain?.join(' → ') || 'None');
  console.log('📊 Tool calls:', result.metadata.totalToolCalls || 0);
  console.log('🔍 Check Langfuse for multi-agent trace with handoffs!\n');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  try {
    // Run all examples
    await example1_BasicToolTracing();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example2_MultipleToolCalls();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await example3_ComplexWorkflow();
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isLangfuseEnabled()) {
      await example4_ManualToolTracing();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await example5_MultiAgentToolTracing();

    // Summary
    console.log('━'.repeat(80));
    console.log('✅ ALL EXAMPLES COMPLETE!');
    console.log('━'.repeat(80));
    console.log('\n📊 Tracing Summary:');
    console.log('   - Tool calls are automatically traced');
    console.log('   - Agent executions are traced');
    console.log('   - Handoffs are traced');
    console.log('   - Custom spans can be added with withFunctionSpan');
    console.log('   - All traces available in Langfuse dashboard');

    if (isLangfuseEnabled()) {
      console.log('\n🔍 View your traces at: https://cloud.langfuse.com');
      console.log('   - Search by agent name, tool name, or session ID');
      console.log('   - View detailed execution times');
      console.log('   - See tool inputs and outputs');
      console.log('   - Track costs and token usage');
    } else {
      console.log('\n💡 To enable tracing:');
      console.log('   1. Sign up at https://langfuse.com');
      console.log('   2. Get your API keys');
      console.log('   3. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY');
      console.log('   4. Run this example again!');
    }

    console.log('');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };

