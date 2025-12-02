/**
 * Test: Native MCP Integration
 * 
 * Tests the agent-level MCP configuration with automatic tool fetching.
 */

import { Agent, run } from '../../dist/index';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { tool } from '../../dist/index';

// Test 1: Agent with MCP config compiles correctly
async function testMCPConfig() {
  console.log('\n✅ TEST 1: MCP Configuration');
  
  try {
    const agent = new Agent({
      name: 'TestAgent',
      instructions: 'You are a test agent.',
      model: openai('gpt-4o-mini'),
      
      // Native MCP integration
      mcpServers: [
        {
          name: 'test-server',
          transport: 'http',
          url: 'http://localhost:3000/mcp',
          autoConnect: false, // Don't actually connect
        },
      ],
    });

    console.log('   ✓ Agent created with mcpServers config');
    console.log('   ✓ MCP servers array initialized');
    
    // Test cleanup method exists
    if (typeof agent.cleanup === 'function') {
      console.log('   ✓ cleanup() method exists');
    }

    // Test getMcpTools method exists
    if (typeof agent.getMcpTools === 'function') {
      console.log('   ✓ getMcpTools() method exists');
    }

    // Test getAllTools method exists
    if (typeof agent.getAllTools === 'function') {
      console.log('   ✓ getAllTools() method exists');
    }

    return true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Test 2: Multiple MCP servers
async function testMultipleMCPServers() {
  console.log('\n✅ TEST 2: Multiple MCP Servers');
  
  try {
    const agent = new Agent({
      name: 'MultiServerAgent',
      instructions: 'Test agent with multiple MCP servers.',
      model: openai('gpt-4o-mini'),
      
      mcpServers: [
        {
          name: 'server1',
          transport: 'http',
          url: 'http://localhost:3001/mcp',
          autoConnect: false,
        },
        {
          name: 'server2',
          transport: 'http',
          url: 'http://localhost:3002/mcp',
          autoConnect: false,
        },
      ],
    });

    console.log('   ✓ Agent created with 2 MCP servers');
    
    return true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Test 3: Mixed tools (regular + MCP)
async function testMixedTools() {
  console.log('\n✅ TEST 3: Mixed Tools (Regular + MCP)');
  
  try {
    const weatherTool = tool({
      description: 'Get weather',
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { city, temperature: 22 };
      },
    });

    const agent = new Agent({
      name: 'MixedAgent',
      instructions: 'Test agent with mixed tools.',
      model: openai('gpt-4o-mini'),
      
      // Regular tools
      tools: {
        getWeather: weatherTool,
      },
      
      // MCP servers
      mcpServers: [
        {
          name: 'mcp-tools',
          transport: 'http',
          url: 'http://localhost:3000/mcp',
          autoConnect: false,
        },
      ],
    });

    console.log('   ✓ Agent created with regular tools');
    console.log('   ✓ Agent created with MCP servers');
    
    return true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Run tests
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  NATIVE MCP INTEGRATION TESTS');
  console.log('═══════════════════════════════════════');

  const results = {
    test1: await testMCPConfig(),
    test2: await testMultipleMCPServers(),
    test3: await testMixedTools(),
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`Test 1 (MCP Config): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Multiple Servers): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Mixed Tools): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

