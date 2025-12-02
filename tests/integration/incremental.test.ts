/**
 * 🔬 INCREMENTAL FEATURE TEST
 * 
 * Tests features one by one, increasing complexity gradually.
 * This will help identify EXACTLY where the SDK breaks.
 */

import 'dotenv/config';
import { 
  Agent, 
  run,
  setDefaultModel,
} from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🔬 INCREMENTAL FEATURE TEST');
console.log('═'.repeat(80));
console.log('Testing features incrementally to identify breaking points\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\n${'▶'.repeat(3)} ${name}`);
  console.log('─'.repeat(80));
  try {
    await testFn();
    console.log('✅ PASS');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ FAIL:', error.message);
    testsFailed++;
    // Don't exit - continue to next test
  }
}

async function main() {
  // ============================================
  // LEVEL 1: Basic Agent (No Tools)
  // ============================================
  await runTest('LEVEL 1: Basic Agent - No Tools', async () => {
    const agent = new Agent({
      name: 'basic',
      instructions: 'You are a helpful assistant. Just answer the question directly.',
    });
    
    const result = await run(agent, 'Say hello', { maxTurns: 3 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
  });

  // ============================================
  // LEVEL 2: Agent with ONE Simple Tool
  // ============================================
  await runTest('LEVEL 2: Agent with ONE Simple Tool', async () => {
    const agent = new Agent({
      name: 'calculator',
      instructions: 'Use the calculate tool for math. Call it once and return the result.',
      tools: {
        calculate: {
          description: 'Calculate a math expression',
          inputSchema: z.object({
            expr: z.string()
          }),
          execute: async ({ expr }: { expr: string }) => {
            console.log(`   🔢 Calculating: ${expr}`);
            return { result: eval(expr) };
          }
        }
      }
    });
    
    const result = await run(agent, 'What is 10 + 5?', { maxTurns: 5 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 3: Agent with TWO Tools
  // ============================================
  await runTest('LEVEL 3: Agent with TWO Tools', async () => {
    const agent = new Agent({
      name: 'helper',
      instructions: 'You have calculate and greet tools. Use the appropriate one.',
      tools: {
        calculate: {
          description: 'Calculate math',
          inputSchema: z.object({ expr: z.string() }),
          execute: async ({ expr }: { expr: string }) => {
            console.log(`   🔢 Calculate: ${expr}`);
            return { result: eval(expr) };
          }
        },
        greet: {
          description: 'Greet a person',
          inputSchema: z.object({ name: z.string() }),
          execute: async ({ name }: { name: string }) => {
            console.log(`   👋 Greet: ${name}`);
            return { greeting: `Hello ${name}!` };
          }
        }
      }
    });
    
    const result = await run(agent, 'Greet Alice', { maxTurns: 5 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 4: Agent with Context
  // ============================================
  await runTest('LEVEL 4: Agent with Context Injection', async () => {
    interface UserContext {
      userName: string;
    }
    
    const agent = new Agent<UserContext>({
      name: 'contextual',
      instructions: (ctx) => `You are helping ${ctx.context.userName}`,
      tools: {
        getInfo: {
          description: 'Get user info',
          inputSchema: z.object({}),
          execute: async (_: any, context: any) => {
            const ctx = context.context as UserContext;
            console.log(`   📋 Getting info for: ${ctx.userName}`);
            return { userName: ctx.userName };
          }
        }
      }
    });
    
    const result = await run(agent, 'Who am I?', {
      context: { userName: 'Bob' },
      maxTurns: 5
    });
    console.log('   Response:', result.finalOutput.substring(0, 80));
  });

  // ============================================
  // LEVEL 5: Coordinator/Triage Pattern (OpenAI Structure)
  // ============================================
  await runTest('LEVEL 5: Coordinator/Triage Pattern', async () => {
    // Specialist Agent with specific tools
    const specialistAgent = new Agent({
      name: 'Specialist Agent',
      instructions: 'You are a specialist agent. Use your analyze tool to provide detailed analysis.',
      tools: {
        analyze: {
          description: 'Analyze the given data and provide insights',
          inputSchema: z.object({
            data: z.string().describe('The data to analyze'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Specialist analyzing: ${data}`);
            return { 
              analysis: `Detailed analysis of: ${data}`,
              conclusion: 'Analysis complete'
            };
          }
        }
      }
    });
    
    // Coordinator/Triage Agent with handoffs array
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: `You are a coordinator agent. Your role is to route requests to the appropriate specialist.
      
      - For analysis requests, hand off to the Specialist Agent.
      - For any question, transfer to the specialist using the handoff tool.`,
      handoffs: [specialistAgent], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Analyze the data: "test data"', { maxTurns: 10 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 6: Agent with THREE Tools (Potential Loop Risk)
  // ============================================
  await runTest('LEVEL 6: Agent with THREE Tools', async () => {
    const agent = new Agent({
      name: 'multi-tool',
      instructions: 'You have 3 tools. Use ONLY ONE tool per request, then respond.',
      tools: {
        search: {
          description: 'Search for information',
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Search: ${query}`);
            return { result: 'Found: Sample data' };
          }
        },
        save: {
          description: 'Save data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   💾 Save: ${data}`);
            return { saved: true };
          }
        },
        analyze: {
          description: 'Analyze data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Analyze: ${data}`);
            return { analysis: 'Data looks good' };
          }
        }
      }
    });
    
    const result = await run(agent, 'Search for "test"', { maxTurns: 5 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 7: Agent Calling Tools in Sequence
  // ============================================
  await runTest('LEVEL 7: Sequential Tool Calls', async () => {
    const agent = new Agent({
      name: 'sequential',
      instructions: 'First search, then analyze the result. Do both steps.',
      tools: {
        search: {
          description: 'Search for data',
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Search: ${query}`);
            return { data: 'sample data' };
          }
        },
        analyze: {
          description: 'Analyze data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Analyze: ${data}`);
            return { result: 'Analysis complete' };
          }
        }
      }
    });
    
    const result = await run(agent, 'Search for "test" and analyze it', { maxTurns: 8 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 8: THREE Agents Multi-Hop Coordinator
  // ============================================
  await runTest('LEVEL 8: THREE Agents Multi-Hop Coordinator', async () => {
    // Final Specialist with completion tool
    const finalSpecialist = new Agent({
      name: 'Final Specialist',
      instructions: 'You are the final specialist. Use your complete tool to finish tasks.',
      tools: {
        complete: {
          description: 'Complete the task and provide final summary',
          inputSchema: z.object({
            summary: z.string().describe('Task summary'),
          }),
          execute: async ({ summary }: { summary: string }) => {
            console.log(`   ✅ Final completion: ${summary}`);
            return { completed: true, summary };
          }
        }
      }
    });
    
    // Processor Agent with processing tool and handoff
    const processorAgent = new Agent({
      name: 'Processor Agent',
      instructions: 'You are a processor. Use your process tool, then transfer to Final Specialist.',
      tools: {
        process: {
          description: 'Process data',
          inputSchema: z.object({
            data: z.string().describe('Data to process'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ⚙️  Processing: ${data}`);
            return { processed: `processed_${data}` };
          }
        }
      },
      handoffs: [finalSpecialist], // Handoffs as array
    });
    
    // Coordinator Agent with handoffs array
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: 'You are the coordinator. Route requests to Processor Agent for processing tasks.',
      handoffs: [processorAgent], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Start the process', { maxTurns: 15 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 9: Agent with Tools AND Handoff
  // ============================================
  await runTest('LEVEL 9: Tools + Handoff Combined', async () => {
    const specialist = new Agent({
      name: 'specialist',
      instructions: 'You are a specialist. Use the analyze tool.',
      tools: {
        analyze: {
          description: 'Analyze something',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Specialist analyzing: ${data}`);
            return { result: 'Analysis done' };
          }
        }
      }
    });
    
    const triage = new Agent({
      name: 'triage',
      instructions: 'First use search tool, then transfer to specialist.',
      tools: {
        search: {
          description: 'Search for data',
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Triage searching: ${query}`);
            return { data: 'found data' };
          }
        }
      }
    });
    
    triage.subagents = [specialist];
    
    const result = await run(triage, 'Search for "test" and get it analyzed', { maxTurns: 12 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 10: Coordinator with Multiple Tools + Specialist
  // ============================================
  await runTest('LEVEL 10: Coordinator with Multiple Tools + Specialist', async () => {
    // Specialist Agent with multiple specialized tools
    const specialistAgent = new Agent({
      name: 'Data Specialist',
      instructions: 'You are a data specialist. Use your tools to analyze and process data.',
      tools: {
        analyze: {
          description: 'Analyze data in detail',
          inputSchema: z.object({ 
            data: z.string().describe('Data to analyze'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Specialist analyzing: ${data}`);
            return { result: 'Analysis complete' };
          }
        },
        process: {
          description: 'Process data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to process'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ⚙️  Specialist processing: ${data}`);
            return { result: 'Processing complete' };
          }
        }
      }
    });
    
    // Coordinator Agent with search/lookup tools and handoffs array
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: `You are a coordinator. Your workflow:
      1. Use search or lookup tool to find information
      2. Then hand off to Data Specialist for analysis/processing`,
      tools: {
        search: {
          description: 'Search for information',
          inputSchema: z.object({ 
            query: z.string().describe('Search query'),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Coordinator searching: ${query}`);
            return { data: `Found: ${query}` };
          }
        },
        lookup: {
          description: 'Lookup information by key',
          inputSchema: z.object({ 
            key: z.string().describe('Lookup key'),
          }),
          execute: async ({ key }: { key: string }) => {
            console.log(`   📋 Coordinator lookup: ${key}`);
            return { info: `Data for ${key}` };
          }
        }
      },
      handoffs: [specialistAgent], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Search for "test"', { maxTurns: 10 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 11: Agent with FIVE Tools
  // ============================================
  await runTest('LEVEL 11: Agent with FIVE Tools', async () => {
    const agent = new Agent({
      name: 'five-tool',
      instructions: 'You have 5 tools. Use the appropriate one based on the request. Use only ONE tool per request.',
      tools: {
        search: {
          description: 'Search for information',
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Search: ${query}`);
            return { result: 'Found data' };
          }
        },
        calculate: {
          description: 'Calculate math expression',
          inputSchema: z.object({ expr: z.string() }),
          execute: async ({ expr }: { expr: string }) => {
            console.log(`   🔢 Calculate: ${expr}`);
            return { result: eval(expr) };
          }
        },
        format: {
          description: 'Format text',
          inputSchema: z.object({ text: z.string() }),
          execute: async ({ text }: { text: string }) => {
            console.log(`   📝 Format: ${text}`);
            return { formatted: text.toUpperCase() };
          }
        },
        validate: {
          description: 'Validate data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ✓ Validate: ${data}`);
            return { valid: true };
          }
        },
        transform: {
          description: 'Transform data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔄 Transform: ${data}`);
            return { transformed: `transformed_${data}` };
          }
        }
      }
    });
    
    const result = await run(agent, 'Calculate 20 * 3', { maxTurns: 5 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 12: FOUR Agents with Complex Handoff Chain
  // ============================================
  await runTest('LEVEL 12: FOUR Agents Multi-Hop Chain', async () => {
    const agentD = new Agent({
      name: 'final',
      instructions: 'You are the final agent. Say: "Task completed by final agent"',
    });
    
    const agentC = new Agent({
      name: 'processor',
      instructions: 'You are a processor. Transfer to final agent.',
    });
    
    const agentB = new Agent({
      name: 'validator',
      instructions: 'You are a validator. Transfer to processor agent.',
    });
    
    const agentA = new Agent({
      name: 'initiator',
      instructions: 'You are the initiator. Transfer to validator agent.',
    });
    
    agentA.subagents = [agentB];
    agentB.subagents = [agentC];
    agentC.subagents = [agentD];
    
    const result = await run(agentA, 'Start the workflow', { maxTurns: 20 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
  });

  // ============================================
  // LEVEL 13: Dynamic Tool Enabling
  // ============================================
  await runTest('LEVEL 13: Dynamic Tool Enabling Based on Context', async () => {
    interface Context {
      userRole: 'admin' | 'user';
    }
    
    const agent = new Agent<Context>({
      name: 'dynamic',
      instructions: 'Use tools based on what is available. Admin tools are only for admins.',
      tools: {
        publicTool: {
          description: 'A public tool everyone can use',
          inputSchema: z.object({ action: z.string() }),
          enabled: true,
          execute: async ({ action }: { action: string }) => {
            console.log(`   🌐 Public: ${action}`);
            return { result: 'Public action done' };
          }
        },
        adminTool: {
          description: 'An admin-only tool',
          inputSchema: z.object({ action: z.string() }),
          enabled: (context) => {
            const ctx = context.context as Context;
            return ctx.userRole === 'admin';
          },
          execute: async ({ action }: { action: string }) => {
            console.log(`   🔐 Admin: ${action}`);
            return { result: 'Admin action done' };
          }
        }
      }
    });
    
    // Test as regular user
    const result1 = await run(agent, 'Use a tool', {
      context: { userRole: 'user' },
      maxTurns: 5
    });
    console.log('   User test - Response:', result1.finalOutput.substring(0, 60));
    
    // Test as admin
    const result2 = await run(agent, 'Use admin tool', {
      context: { userRole: 'admin' },
      maxTurns: 5
    });
    console.log('   Admin test - Response:', result2.finalOutput.substring(0, 60));
    console.log('   Tools called:', result2.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 14: Complex Context with Multiple Properties
  // ============================================
  await runTest('LEVEL 14: Complex Context Injection', async () => {
    interface ComplexContext {
      user: {
        name: string;
        role: string;
        permissions: string[];
      };
      session: {
        id: string;
        startTime: number;
      };
      settings: {
        theme: string;
        language: string;
      };
    }
    
    const agent = new Agent<ComplexContext>({
      name: 'complex-context',
      instructions: (ctx) => {
        const c = ctx.context;
        return `You are helping ${c.user.name} (${c.user.role}) in session ${c.session.id}. Theme: ${c.settings.theme}, Language: ${c.settings.language}`;
      },
      tools: {
        getUserInfo: {
          description: 'Get user information',
          inputSchema: z.object({}),
          execute: async (_: any, context: any) => {
            const ctx = context.context as ComplexContext;
            console.log(`   👤 User: ${ctx.user.name}, Role: ${ctx.user.role}`);
            return { 
              name: ctx.user.name,
              role: ctx.user.role,
              permissions: ctx.user.permissions 
            };
          }
        },
        getSessionInfo: {
          description: 'Get session information',
          inputSchema: z.object({}),
          execute: async (_: any, context: any) => {
            const ctx = context.context as ComplexContext;
            console.log(`   📊 Session: ${ctx.session.id}`);
            return { 
              id: ctx.session.id,
              startTime: ctx.session.startTime 
            };
          }
        }
      }
    });
    
    const result = await run(agent, 'Tell me about the user and session', {
      context: {
        user: { name: 'Alice', role: 'admin', permissions: ['read', 'write'] },
        session: { id: 'sess-123', startTime: Date.now() },
        settings: { theme: 'dark', language: 'en' }
      },
      maxTurns: 8
    });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 15: Long Sequential Tool Chain (5+ tools)
  // ============================================
  await runTest('LEVEL 15: Long Sequential Tool Chain', async () => {
    const agent = new Agent({
      name: 'chain',
      instructions: 'Execute tools in this exact sequence: fetch -> parse -> validate -> transform -> save. Do all 5 steps.',
      tools: {
        fetch: {
          description: 'Fetch data from source',
          inputSchema: z.object({ source: z.string() }),
          execute: async ({ source }: { source: string }) => {
            console.log(`   📥 Fetch: ${source}`);
            return { data: 'raw data from source' };
          }
        },
        parse: {
          description: 'Parse the fetched data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   📄 Parse: ${data}`);
            return { parsed: 'parsed data' };
          }
        },
        validate: {
          description: 'Validate the parsed data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ✓ Validate: ${data}`);
            return { valid: true, data };
          }
        },
        transform: {
          description: 'Transform the validated data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔄 Transform: ${data}`);
            return { transformed: 'transformed data' };
          }
        },
        save: {
          description: 'Save the transformed data',
          inputSchema: z.object({ data: z.string() }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   💾 Save: ${data}`);
            return { saved: true, id: '123' };
          }
        }
      }
    });
    
    const result = await run(agent, 'Process data from "api" source', { maxTurns: 15 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 16: Coordinator with Multiple Specialist Options
  // ============================================
  await runTest('LEVEL 16: Coordinator with Multiple Specialists', async () => {
    // Math Specialist with math tools
    const mathSpecialist = new Agent({
      name: 'Math Specialist',
      instructions: 'You are a math specialist. Use your calculate tool for math problems.',
      tools: {
        calculate: {
          description: 'Calculate mathematical expressions',
          inputSchema: z.object({
            expression: z.string().describe('Math expression to calculate'),
          }),
          execute: async ({ expression }: { expression: string }) => {
            console.log(`   🔢 Math calculation: ${expression}`);
            return { result: eval(expression) };
          }
        }
      }
    });
    
    // Text Specialist with text tools
    const textSpecialist = new Agent({
      name: 'Text Specialist',
      instructions: 'You are a text specialist. Use your format tool for text operations.',
      tools: {
        format: {
          description: 'Format text',
          inputSchema: z.object({
            text: z.string().describe('Text to format'),
          }),
          execute: async ({ text }: { text: string }) => {
            console.log(`   📝 Text formatting: ${text}`);
            return { formatted: text.toUpperCase() };
          }
        }
      }
    });
    
    // Code Specialist with code tools
    const codeSpecialist = new Agent({
      name: 'Code Specialist',
      instructions: 'You are a code specialist. Use your generate tool for code generation.',
      tools: {
        generate: {
          description: 'Generate code',
          inputSchema: z.object({
            description: z.string().describe('Code description'),
          }),
          execute: async ({ description }: { description: string }) => {
            console.log(`   💻 Code generation: ${description}`);
            return { code: `function ${description}() {}` };
          }
        }
      }
    });
    
    // Coordinator/Router with handoffs array
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: `You are a coordinator. Route requests to appropriate specialists:
      - Math questions → Math Specialist
      - Text operations → Text Specialist  
      - Code requests → Code Specialist`,
      handoffs: [mathSpecialist, textSpecialist, codeSpecialist], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'What is 2 + 2?', { maxTurns: 10 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 17: Coordinator Chain with Tools at Each Level
  // ============================================
  await runTest('LEVEL 17: Coordinator Chain with Tools at Each Level', async () => {
    // Final Specialist with completion tool
    const finalSpecialist = new Agent({
      name: 'Final Specialist',
      instructions: 'You are the final specialist. Use your complete tool to finish tasks.',
      tools: {
        complete: {
          description: 'Complete the task and provide summary',
          inputSchema: z.object({ 
            summary: z.string().describe('Task summary'),
          }),
          execute: async ({ summary }: { summary: string }) => {
            console.log(`   ✅ Final completion: ${summary}`);
            return { done: true, summary };
          }
        }
      }
    });
    
    // Processor Agent with processing tool and handoff
    const processorAgent = new Agent({
      name: 'Processor Agent',
      instructions: 'You are a processor. Use your process tool, then transfer to Final Specialist.',
      tools: {
        process: {
          description: 'Process data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to process'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ⚙️  Processing: ${data}`);
            return { processed: `processed_${data}` };
          }
        }
      },
      handoffs: [finalSpecialist], // Handoffs as array
    });
    
    // Coordinator Agent with preparation tool and handoff
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: 'You are a coordinator. Use your prepare tool, then transfer to Processor Agent.',
      tools: {
        prepare: {
          description: 'Prepare data for processing',
          inputSchema: z.object({ 
            input: z.string().describe('Input to prepare'),
          }),
          execute: async ({ input }: { input: string }) => {
            console.log(`   📋 Coordinator preparing: ${input}`);
            return { prepared: `prepared_${input}` };
          }
        }
      },
      handoffs: [processorAgent], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Prepare "test", process it, and complete', { maxTurns: 20 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 18: Conditional Handoffs Based on Context
  // ============================================
  await runTest('LEVEL 18: Conditional Handoffs with Context', async () => {
    interface TaskContext {
      taskType: 'simple' | 'complex';
      priority: 'low' | 'high';
    }
    
    const complexAgent = new Agent({
      name: 'complex-handler',
      instructions: 'You handle complex tasks. Say: "Complex task handled"',
    });
    
    const simpleAgent = new Agent({
      name: 'simple-handler',
      instructions: 'You handle simple tasks. Say: "Simple task handled"',
    });
    
    // Create separate router instances to avoid state issues
    const router1 = new Agent<TaskContext>({
      name: 'router-complex',
      instructions: 'Route tasks based on complexity. Transfer to complex-handler for complex tasks, simple-handler for simple tasks.',
    });
    
    router1.subagents = [complexAgent, simpleAgent];
    
    // Test with complex task
    const result1 = await run(router1, 'Handle this complex task', {
      context: { taskType: 'complex', priority: 'high' },
      maxTurns: 10
    });
    console.log('   Complex task - Response:', result1.finalOutput.substring(0, 60));
    console.log('   Complex task - Handoff chain:', result1.metadata.handoffChain);
    
    // Create a fresh router for the second test
    const router2 = new Agent<TaskContext>({
      name: 'router-simple',
      instructions: 'Route tasks based on complexity. Transfer to complex-handler for complex tasks, simple-handler for simple tasks.',
    });
    
    router2.subagents = [complexAgent, simpleAgent];
    
    // Test with simple task
    const result2 = await run(router2, 'Handle this simple task', {
      context: { taskType: 'simple', priority: 'low' },
      maxTurns: 10
    });
    console.log('   Simple task - Response:', result2.finalOutput.substring(0, 60));
    console.log('   Simple task - Handoff chain:', result2.metadata.handoffChain);
  });

  // ============================================
  // LEVEL 19: Coordinator with Many Tools + Multiple Specialists
  // ============================================
  await runTest('LEVEL 19: Coordinator with Many Tools + Multiple Specialists', async () => {
    // Specialist A with specific tools
    const specialistA = new Agent({
      name: 'Specialist A',
      instructions: 'You are Specialist A. Use your toolA for A-type operations.',
      tools: {
        toolA: {
          description: 'Tool A functionality for type A operations',
          inputSchema: z.object({ 
            input: z.string().describe('Input for tool A'),
          }),
          execute: async ({ input }: { input: string }) => {
            console.log(`   🔧 Specialist A: ${input}`);
            return { result: 'A operation complete' };
          }
        }
      }
    });
    
    // Specialist B with specific tools
    const specialistB = new Agent({
      name: 'Specialist B',
      instructions: 'You are Specialist B. Use your toolB for B-type operations.',
      tools: {
        toolB: {
          description: 'Tool B functionality for type B operations',
          inputSchema: z.object({ 
            input: z.string().describe('Input for tool B'),
          }),
          execute: async ({ input }: { input: string }) => {
            console.log(`   🔧 Specialist B: ${input}`);
            return { result: 'B operation complete' };
          }
        }
      }
    });
    
    // Coordinator Agent with multiple tools and handoffs array
    const coordinatorAgent = new Agent({
      name: 'Coordinator Agent',
      instructions: `You are a coordinator. You have multiple tools for initial processing.
      After using a tool, transfer to an appropriate specialist:
      - For A-type operations → Specialist A
      - For B-type operations → Specialist B`,
      tools: {
        search: {
          description: 'Search for information',
          inputSchema: z.object({ 
            query: z.string().describe('Search query'),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Coordinator searching: ${query}`);
            return { data: `Found: ${query}` };
          }
        },
        analyze: {
          description: 'Analyze data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to analyze'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Coordinator analyzing: ${data}`);
            return { analysis: 'Analysis complete' };
          }
        },
        validate: {
          description: 'Validate data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to validate'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ✓ Coordinator validating: ${data}`);
            return { valid: true };
          }
        },
        transform: {
          description: 'Transform data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to transform'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔄 Coordinator transforming: ${data}`);
            return { transformed: 'transformed' };
          }
        },
        prepare: {
          description: 'Prepare data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to prepare'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   📋 Coordinator preparing: ${data}`);
            return { prepared: 'prepared' };
          }
        }
      },
      handoffs: [specialistA, specialistB], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Search for "test" and get it handled by a specialist', { maxTurns: 15 });
    console.log('   Response:', result.finalOutput.substring(0, 80));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
  });

  // ============================================
  // LEVEL 20: MAXIMUM COMPLEXITY - Coordinator Pattern with All Features
  // ============================================
  await runTest('LEVEL 20: MAXIMUM COMPLEXITY - Coordinator Pattern', async () => {
    interface MaxContext {
      user: { name: string; role: string };
      session: { id: string };
      config: { mode: string };
    }
    
    // Final Specialist with context-aware tools
    const finalSpecialist = new Agent<MaxContext>({
      name: 'Final Specialist',
      instructions: (ctx) => `You are the final specialist for ${ctx.context.user.name}. Use your finalize tool to complete tasks.`,
      tools: {
        finalize: {
          description: 'Finalize the entire process',
          inputSchema: z.object({ 
            summary: z.string().describe('Process summary'),
          }),
          execute: async ({ summary }: { summary: string }, context: any) => {
            const ctx = context.context as MaxContext;
            console.log(`   🎯 Final Specialist finalizing for ${ctx.user.name}: ${summary}`);
            return { finalized: true, summary, session: ctx.session.id };
          }
        },
        report: {
          description: 'Generate final report (admin only)',
          inputSchema: z.object({ 
            data: z.string().describe('Report data'),
          }),
          enabled: (context) => {
            const ctx = context.context as MaxContext;
            return ctx.user.role === 'admin';
          },
          execute: async ({ data }: { data: string }) => {
            console.log(`   📊 Final Specialist report: ${data}`);
            return { report: 'Report generated' };
          }
        }
      }
    });
    
    // Processor Agent with processing tools and handoff
    const processorAgent = new Agent<MaxContext>({
      name: 'Processor Agent',
      instructions: 'You are a processor. Use your process and validate tools in sequence, then transfer to Final Specialist.',
      tools: {
        process: {
          description: 'Process data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to process'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ⚙️  Processor processing: ${data}`);
            return { processed: `processed_${data}` };
          }
        },
        validate: {
          description: 'Validate processed data',
          inputSchema: z.object({ 
            data: z.string().describe('Data to validate'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   ✓ Processor validating: ${data}`);
            return { valid: true, data };
          }
        }
      },
      handoffs: [finalSpecialist], // Handoffs as array
    });
    
    // Coordinator Agent with search/analyze tools and handoff
    const coordinatorAgent = new Agent<MaxContext>({
      name: 'Coordinator Agent',
      instructions: (ctx) => `You are coordinating for ${ctx.context.user.name}. 
      Use your search and analyze tools, then transfer to Processor Agent.`,
      tools: {
        search: {
          description: 'Search for information',
          inputSchema: z.object({ 
            query: z.string().describe('Search query'),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log(`   🔍 Coordinator searching: ${query}`);
            return { data: `Search results for: ${query}` };
          }
        },
        analyze: {
          description: 'Analyze search results',
          inputSchema: z.object({ 
            data: z.string().describe('Data to analyze'),
          }),
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔬 Coordinator analyzing: ${data}`);
            return { analysis: 'Analysis complete' };
          }
        },
        transform: {
          description: 'Transform data (advanced mode only)',
          inputSchema: z.object({ 
            data: z.string().describe('Data to transform'),
          }),
          enabled: (context) => {
            const ctx = context.context as MaxContext;
            return ctx.config.mode === 'advanced';
          },
          execute: async ({ data }: { data: string }) => {
            console.log(`   🔄 Coordinator transforming: ${data}`);
            return { transformed: 'transformed' };
          }
        }
      },
      handoffs: [processorAgent], // Handoffs as array
    });
    
    const result = await run(coordinatorAgent, 'Search for "test", analyze it, process it, validate it, and finalize', {
      context: {
        user: { name: 'Alice', role: 'admin' },
        session: { id: 'sess-max-123' },
        config: { mode: 'advanced' }
      },
      maxTurns: 25
    });
    
    console.log('   Response:', result.finalOutput.substring(0, 100));
    console.log('   Handoff chain:', result.metadata.handoffChain);
    console.log('   Tools called:', result.metadata.totalToolCalls);
    console.log('   Total turns:', result.metadata.totalTurns);
  });

  // ============================================
  // FINAL REPORT
  // ============================================
  console.log('\n\n📊 FINAL REPORT');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('');
  
  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! SDK is working perfectly at all levels!');
  } else {
    console.log('⚠️  Some tests failed. Review the output above to see where complexity breaks.');
  }
  
  console.log('═'.repeat(80));
  console.log('');
}

main();

