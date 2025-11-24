/**
 * TOON Format Usage Examples
 * 
 * Demonstrates how to use TOON format for efficient LLM token usage
 * TOON provides 40%+ token reduction compared to JSON
 * 
 * @see https://github.com/toon-format/toon
 */

import 'dotenv/config';
import { 
  Agent, 
  run, 
  encodeTOON, 
  decodeTOON, 
  formatToolResultTOON,
  calculateTokenSavings 
} from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const model = openai('gpt-4o-mini') as any;

// ============================================
// Example 1: Encoding data to TOON
// ============================================

async function example1_BasicEncoding() {
  console.log('📦 Example 1: Basic TOON Encoding\n');
  
  const users = [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Charlie', role: 'user', active: false }
  ];
  
  const json = JSON.stringify(users, null, 2);
  const toon = encodeTOON({ users });
  
  console.log('JSON format:');
  console.log(json);
  console.log();
  
  console.log('TOON format:');
  console.log(toon);
  console.log();
  
  const savings = calculateTokenSavings({ users });
  console.log(`Token savings: ${savings.savingsPercent}% (${savings.savings} tokens saved)`);
  console.log(`JSON: ${savings.jsonTokens} tokens | TOON: ${savings.toonTokens} tokens`);
  console.log();
}

// ============================================
// Example 2: Using TOON with tool results
// ============================================

async function example2_ToolResultsInTOON() {
  console.log('🔧 Example 2: Tool Results in TOON Format\n');
  
  const agent = new Agent({
    name: 'data-agent',
    model,
    instructions: `You are a data analyst. When you receive data, analyze it and provide insights.
    
    Data will be provided in TOON format (Token-Oriented Object Notation).
    TOON format is like: arrayName[count]{field1,field2}: value1,value2
    
    Parse and analyze the data efficiently.`,
    tools: {
      getUserStats: {
        description: 'Get user statistics',
        parameters: z.object({}),
        execute: async () => {
          const stats = {
            users: [
              { date: '2025-01-01', signups: 150, active: 120, revenue: 5000 },
              { date: '2025-01-02', signups: 200, active: 180, revenue: 7500 },
              { date: '2025-01-03', signups: 180, active: 165, revenue: 6800 }
            ]
          };
          
          // Return TOON-formatted data instead of JSON
          const toon = encodeTOON(stats);
          console.log('Tool returning TOON format:');
          console.log(toon);
          console.log();
          
          return toon;
        },
      },
    },
  });
  
  const result = await run(agent, 'Get the user statistics and tell me the trend');
  console.log('Agent response:', result.finalOutput);
  console.log();
}

// ============================================
// Example 3: Decoding TOON from LLM response
// ============================================

async function example3_DecodingTOON() {
  console.log('📥 Example 3: Decoding TOON Data\n');
  
  const toonData = `users[3]{id,name,role}:
  1,Alice,admin
  2,Bob,user
  3,Charlie,user`;
  
  console.log('TOON input:');
  console.log(toonData);
  console.log();
  
  const decoded = decodeTOON(toonData);
  console.log('Decoded JavaScript object:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log();
}

// ============================================
// Example 4: Complex nested data
// ============================================

async function example4_ComplexData() {
  console.log('🏗️  Example 4: Complex Nested Data\n');
  
  const complexData = {
    project: {
      name: 'AI Agent SDK',
      version: '1.0.0',
      stats: {
        stars: 1000,
        forks: 50,
        issues: 10
      }
    },
    contributors: [
      { username: 'alice', commits: 500, role: 'maintainer' },
      { username: 'bob', commits: 200, role: 'contributor' },
      { username: 'charlie', commits: 150, role: 'contributor' }
    ],
    releases: [
      { version: '1.0.0', date: '2025-01-15', downloads: 5000 },
      { version: '0.9.0', date: '2025-01-01', downloads: 3000 }
    ]
  };
  
  const json = JSON.stringify(complexData);
  const toon = encodeTOON(complexData);
  
  console.log('TOON format for complex data:');
  console.log(toon);
  console.log();
  
  const savings = calculateTokenSavings(complexData);
  console.log(`Token savings: ${savings.savingsPercent}%`);
  console.log(`Characters: JSON=${json.length} | TOON=${toon.length}`);
  console.log();
}

// ============================================
// Example 5: Real-world use case - Database query results
// ============================================

async function example5_DatabaseResults() {
  console.log('💾 Example 5: Database Query Results\n');
  
  // Simulating database query results
  const queryResults = {
    query: 'SELECT * FROM orders WHERE date >= 2025-01-01',
    results: [
      { id: 1001, customer: 'Acme Corp', amount: 5000, status: 'paid', date: '2025-01-02' },
      { id: 1002, customer: 'TechStart', amount: 3500, status: 'pending', date: '2025-01-03' },
      { id: 1003, customer: 'DataFlow', amount: 7200, status: 'paid', date: '2025-01-04' },
      { id: 1004, customer: 'CloudBase', amount: 4100, status: 'paid', date: '2025-01-05' },
      { id: 1005, customer: 'AI Solutions', amount: 9800, status: 'pending', date: '2025-01-06' }
    ],
    total: 5,
    executionTime: '23ms'
  };
  
  console.log('JSON format (what you\'d normally send to LLM):');
  const json = JSON.stringify(queryResults, null, 2);
  console.log(json);
  console.log(`\nLength: ${json.length} characters`);
  console.log();
  
  console.log('TOON format (40%+ more efficient):');
  const toon = encodeTOON(queryResults);
  console.log(toon);
  console.log(`\nLength: ${toon.length} characters`);
  console.log();
  
  const savings = calculateTokenSavings(queryResults);
  console.log('📊 Efficiency Comparison:');
  console.log(`   JSON: ${savings.jsonTokens} tokens`);
  console.log(`   TOON: ${savings.toonTokens} tokens`);
  console.log(`   Saved: ${savings.savings} tokens (${savings.savingsPercent}%)`);
  console.log(`   Characters saved: ${json.length - toon.length}`);
  console.log();
}

// ============================================
// Run all examples
// ============================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   TOON Format Usage Examples                         ║');
  console.log('║   Token-Oriented Object Notation                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();
  
  await example1_BasicEncoding();
  console.log('─'.repeat(60));
  console.log();
  
  await example3_DecodingTOON();
  console.log('─'.repeat(60));
  console.log();
  
  await example4_ComplexData();
  console.log('─'.repeat(60));
  console.log();
  
  await example5_DatabaseResults();
  console.log('─'.repeat(60));
  console.log();
  
  // Skip example 2 if no API key to avoid errors
  if (process.env.OPENAI_API_KEY) {
    await example2_ToolResultsInTOON();
    console.log('─'.repeat(60));
    console.log();
  }
  
  console.log('✅ All TOON examples completed!');
  console.log();
  console.log('💡 Key Benefits:');
  console.log('   • 40%+ token reduction vs JSON');
  console.log('   • Human-readable format');
  console.log('   • Schema-aware (field names declared once)');
  console.log('   • Tab-delimited for even better efficiency');
  console.log('   • Perfect for LLM context windows');
  console.log();
  console.log('📚 Learn more: https://github.com/toon-format/toon');
  console.log();
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };


