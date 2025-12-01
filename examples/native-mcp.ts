/**
 * Native MCP Integration Example
 * 
 * Demonstrates agent-level MCP configuration with automatic tool fetching.
 */

import { Agent, run } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';

// ============================================
// EXAMPLE 1: Basic Native MCP
// ============================================

async function basicNativeMCPExample() {
  console.log('\n=== EXAMPLE 1: Basic Native MCP ===\n');

  const agent = new Agent({
    name: 'FileSystemAgent',
    instructions: 'You are a file system assistant. Help users with file operations.',
    model: openai('gpt-4o-mini'),
    
    // Native MCP integration - tools automatically fetched!
    mcpServers: [
      {
        name: 'filesystem',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        autoConnect: true,
      },
    ],
  });

  // MCP tools are automatically available
  const result = await run(agent, 'List files in the current directory');
  
  console.log(result.output);
  
  // Cleanup
  await agent.cleanup();
}

// ============================================
// EXAMPLE 2: Multiple MCP Servers
// ============================================

async function multipleMCPServersExample() {
  console.log('\n=== EXAMPLE 2: Multiple MCP Servers ===\n');

  const agent = new Agent({
    name: 'MultiServerAgent',
    instructions: 'You have access to filesystem and database tools.',
    model: openai('gpt-4o-mini'),
    
    mcpServers: [
      {
        name: 'filesystem',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      },
      {
        name: 'database',
        transport: 'http',
        url: 'http://localhost:3000/mcp',
        auth: {
          type: 'bearer',
          token: process.env.MCP_TOKEN,
        },
      },
    ],
  });

  // Get all tools (regular + MCP from both servers)
  const allTools = await agent.getAllTools();
  console.log('Available tools:', Object.keys(allTools));

  // Run agent
  const result = await run(agent, 'Read file /tmp/test.txt and save to database');
  console.log(result.output);

  await agent.cleanup();
}

// ============================================
// EXAMPLE 3: HTTP MCP with Auth
// ============================================

async function httpMCPExample() {
  console.log('\n=== EXAMPLE 3: HTTP MCP with Auth ===\n');

  const agent = new Agent({
    name: 'HTTPMCPAgent',
    instructions: 'You are a research assistant with web access.',
    model: openai('gpt-4o-mini'),
    
    mcpServers: [
      {
        name: 'web-tools',
        transport: 'http',
        url: 'https://api.example.com/mcp',
        auth: {
          type: 'bearer',
          token: 'your-api-key',
        },
        capabilities: ['tools', 'resources'],
        autoConnect: true,
        autoRefreshInterval: 300000, // Refresh tools every 5 minutes
      },
    ],
  });

  const result = await run(agent, 'Search for latest AI news');
  console.log(result.output);

  await agent.cleanup();
}

// ============================================
// EXAMPLE 4: Tool Filtering
// ============================================

async function toolFilteringExample() {
  console.log('\n=== EXAMPLE 4: Tool Filtering ===\n');

  const agent = new Agent({
    name: 'FilteredAgent',
    instructions: 'You can only read files, not write them.',
    model: openai('gpt-4o-mini'),
    
    mcpServers: [
      {
        name: 'filesystem',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        // Only allow specific tools
        tools: ['read_file', 'list_directory'],
      },
    ],
  });

  const result = await run(agent, 'What files are in /tmp?');
  console.log(result.output);

  await agent.cleanup();
}

// ============================================
// EXAMPLE 5: Manual Tool Refresh
// ============================================

async function manualRefreshExample() {
  console.log('\n=== EXAMPLE 5: Manual Tool Refresh ===\n');

  const agent = new Agent({
    name: 'RefreshAgent',
    instructions: 'You are a dynamic agent with refreshable tools.',
    model: openai('gpt-4o-mini'),
    
    mcpServers: [
      {
        name: 'dynamic-tools',
        transport: 'http',
        url: 'http://localhost:3000/mcp',
      },
    ],
  });

  // Get initial tools
  const tools1 = await agent.getAllTools();
  console.log('Initial tools:', Object.keys(tools1));

  // ... server adds new tools ...

  // Manually refresh
  await agent.refreshMcpTools();

  const tools2 = await agent.getAllTools();
  console.log('After refresh:', Object.keys(tools2));

  await agent.cleanup();
}

// ============================================
// EXAMPLE 6: Mixed Tools (Regular + MCP)
// ============================================

import { tool } from 'tawk-agents-sdk';
import { z } from 'zod';

async function mixedToolsExample() {
  console.log('\n=== EXAMPLE 6: Mixed Tools (Regular + MCP) ===\n');

  const weatherTool = tool({
    description: 'Get weather for a city',
    inputSchema: z.object({
      city: z.string(),
    }),
    execute: async ({ city }) => {
      return { city, temperature: 22, condition: 'Sunny' };
    },
  });

  const agent = new Agent({
    name: 'MixedAgent',
    instructions: 'You have both regular tools and MCP tools.',
    model: openai('gpt-4o-mini'),
    
    // Regular tools
    tools: {
      getWeather: weatherTool,
    },
    
    // MCP servers
    mcpServers: [
      {
        name: 'filesystem',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      },
    ],
  });

  // Both regular and MCP tools are available
  const allTools = await agent.getAllTools();
  console.log('All tools:', Object.keys(allTools));

  const result = await run(agent, 'What is the weather in Tokyo? Also list files in /tmp.');
  console.log(result.output);

  await agent.cleanup();
}

// ============================================
// RUN EXAMPLES
// ============================================

async function main() {
  try {
    await basicNativeMCPExample();
    // await multipleMCPServersExample();
    // await httpMCPExample();
    // await toolFilteringExample();
    // await manualRefreshExample();
    // await mixedToolsExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };

