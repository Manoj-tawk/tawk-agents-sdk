/**
 * Dynamic HITL (Human-in-the-Loop) Approvals Example
 * 
 * Demonstrates context-aware, dynamic approval flows for safe tool execution.
 */

import { Agent, run, tool } from 'tawk-agents-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import {
  ApprovalManager,
  ApprovalPolicies,
  toolWithApproval,
  formatApprovalRequest,
} from 'tawk-agents-sdk';
import * as readline from 'readline/promises';

// ============================================
// CONTEXT TYPE
// ============================================

interface AppContext {
  user: {
    id: string;
    roles: string[];
    isAdmin: boolean;
  };
  deletionCount: number;
  fileOperations: number;
}

// ============================================
// EXAMPLE 1: Basic Dynamic Approval
// ============================================

async function basicDynamicApprovalExample() {
  console.log('\n=== EXAMPLE 1: Basic Dynamic Approval ===\n');

  const deleteFileTool = toolWithApproval({
    description: 'Delete a file',
    inputSchema: z.object({
      path: z.string().describe('File path to delete'),
    }),
    
    // Dynamic approval - context-aware
    needsApproval: async (context: AppContext, args) => {
      // Admin users don't need approval
      if (context.user.isAdmin) {
        return false;
      }
      
      // Sensitive paths always need approval
      if (args.path.startsWith('/system/') || args.path.startsWith('/etc/')) {
        return true;
      }
      
      // After 5 deletions, require approval
      if (context.deletionCount >= 5) {
        return true;
      }
      
      return false;
    },
    
    approvalMetadata: {
      severity: 'high',
      category: 'file_operations',
      reason: 'File deletion is irreversible',
    },
    
    execute: async ({ path }, context: AppContext) => {
      // Increment deletion count
      context.deletionCount++;
      return { success: true, deleted: path };
    },
  });

  const agent = new Agent<AppContext>({
    name: 'FileAgent',
    instructions: 'You help users manage files.',
    model: openai('gpt-4o-mini'),
    tools: {
      deleteFile: deleteFileTool,
    },
  });

  // Test 1: Admin user (no approval needed)
  console.log('Test 1: Admin user');
  const adminContext: AppContext = {
    user: { id: '1', roles: ['admin'], isAdmin: true },
    deletionCount: 0,
    fileOperations: 0,
  };

  const result1 = await run(agent, 'Delete /tmp/test.txt', {
    context: adminContext,
  });
  console.log('Result:', result1.output);

  // Test 2: Regular user, safe path (no approval)
  console.log('\nTest 2: Regular user, safe path');
  const userContext: AppContext = {
    user: { id: '2', roles: ['user'], isAdmin: false },
    deletionCount: 0,
    fileOperations: 0,
  };

  const result2 = await run(agent, 'Delete /tmp/file.txt', {
    context: userContext,
  });
  console.log('Result:', result2.output);

  // Test 3: Sensitive path (needs approval)
  console.log('\nTest 3: Sensitive path (needs approval)');
  // This would trigger approval flow
  console.log('Would require approval for: /system/important.txt');
}

// ============================================
// EXAMPLE 2: Multiple Approval Policies
// ============================================

async function multipleApprovalPoliciesExample() {
  console.log('\n=== EXAMPLE 2: Multiple Approval Policies ===\n');

  const databaseTool = toolWithApproval({
    description: 'Execute database query',
    inputSchema: z.object({
      query: z.string(),
      database: z.string(),
    }),
    
    // Combine multiple policies
    needsApproval: ApprovalPolicies.any(
      ApprovalPolicies.requireAdminRole('dba'),
      ApprovalPolicies.requireForArgs((args) => 
        args.query.toLowerCase().includes('drop') ||
        args.query.toLowerCase().includes('delete')
      ),
      ApprovalPolicies.requireForArgs((args) =>
        args.database === 'production'
      )
    ),
    
    approvalMetadata: {
      severity: 'critical',
      category: 'database',
      requiredRole: 'dba',
    },
    
    execute: async ({ query, database }) => {
      return { executed: true, query, database };
    },
  });

  // Test different scenarios
  const scenarios = [
    {
      name: 'Safe query on dev database',
      query: 'SELECT * FROM users LIMIT 10',
      database: 'development',
      user: { roles: ['developer'] },
    },
    {
      name: 'Dangerous query (DROP)',
      query: 'DROP TABLE users',
      database: 'development',
      user: { roles: ['developer'] },
    },
    {
      name: 'Production database access',
      query: 'SELECT * FROM users',
      database: 'production',
      user: { roles: ['developer'] },
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.name}`);
    
    const needsApproval = await ApprovalPolicies.any(
      ApprovalPolicies.requireAdminRole('dba'),
      ApprovalPolicies.requireForArgs((args) =>
        args.query.toLowerCase().includes('drop') ||
        args.query.toLowerCase().includes('delete')
      ),
      ApprovalPolicies.requireForArgs((args) => args.database === 'production')
    )({ user: scenario.user }, { query: scenario.query, database: scenario.database }, 'test-id');
    
    console.log(`Needs approval: ${needsApproval ? '✅ YES' : '❌ NO'}`);
  }
}

// ============================================
// EXAMPLE 3: Approval Manager Integration
// ============================================

async function approvalManagerExample() {
  console.log('\n=== EXAMPLE 3: Approval Manager Integration ===\n');

  const manager = new ApprovalManager();

  const expensiveTool = toolWithApproval({
    description: 'Execute expensive operation',
    inputSchema: z.object({
      amount: z.number(),
    }),
    
    needsApproval: (context, args) => args.amount > 1000,
    
    approvalMetadata: {
      severity: 'high',
      category: 'financial',
      reason: 'High-value transaction',
    },
    
    execute: async ({ amount }) => {
      return { charged: amount };
    },
  });

  // Check if approval is needed
  const needsApproval = await manager.checkNeedsApproval(
    expensiveTool,
    {},
    { amount: 5000 },
    'call-123'
  );

  console.log(`Needs approval: ${needsApproval}`);

  if (needsApproval) {
    // Create approval request
    const request = manager.createApprovalRequest(
      'expensiveOperation',
      expensiveTool,
      { amount: 5000 },
      'call-123',
      {},
      'Amount exceeds threshold'
    );

    console.log('\n' + formatApprovalRequest(request));

    // Simulate approval
    manager.approve('call-123', 'Approved by manager', 'manager@example.com');

    console.log('\n✅ Approved!');
  }

  // Check pending approvals
  const pending = manager.getPendingApprovals();
  console.log(`\nPending approvals: ${pending.length}`);

  // Check history
  const history = manager.getHistory();
  console.log(`Approval history: ${history.length} items`);
}

// ============================================
// EXAMPLE 4: Interactive Approval Flow
// ============================================

async function interactiveApprovalExample() {
  console.log('\n=== EXAMPLE 4: Interactive Approval Flow ===\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const manager = new ApprovalManager();

  const shutdownTool = toolWithApproval({
    description: 'Shutdown system',
    inputSchema: z.object({
      force: z.boolean().optional(),
    }),
    
    needsApproval: () => true, // Always require approval
    
    approvalMetadata: {
      severity: 'critical',
      category: 'system',
      reason: 'System shutdown is disruptive',
    },
    
    execute: async ({ force }) => {
      return { shutdown: true, force };
    },
  });

  // Check if approval needed
  const needsApproval = await manager.checkNeedsApproval(
    shutdownTool,
    {},
    { force: false },
    'shutdown-123'
  );

  if (needsApproval) {
    const request = manager.createApprovalRequest(
      'shutdown',
      shutdownTool,
      { force: false },
      'shutdown-123',
      {}
    );

    console.log(formatApprovalRequest(request));
    
    const answer = await rl.question('\nApprove? (yes/no): ');
    
    if (answer.toLowerCase() === 'yes') {
      manager.approve('shutdown-123', 'User approved');
      console.log('✅ Approved - proceeding with shutdown');
    } else {
      manager.reject('shutdown-123', 'User rejected');
      console.log('❌ Rejected - shutdown cancelled');
    }
  }

  rl.close();
}

// ============================================
// EXAMPLE 5: Severity-Based Approvals
// ============================================

async function severityBasedExample() {
  console.log('\n=== EXAMPLE 5: Severity-Based Approvals ===\n');

  const tools = [
    {
      name: 'readFile',
      severity: 'low' as const,
      needsApproval: () => false,
    },
    {
      name: 'writeFile',
      severity: 'medium' as const,
      needsApproval: (context: any) => !context.user.isVerified,
    },
    {
      name: 'deleteFile',
      severity: 'high' as const,
      needsApproval: (context: any) => !context.user.isAdmin,
    },
    {
      name: 'formatDisk',
      severity: 'critical' as const,
      needsApproval: () => true,
    },
  ];

  console.log('Tool Approval Matrix:\n');
  console.log('| Tool         | Severity | Needs Approval |');
  console.log('|--------------|----------|----------------|');

  for (const tool of tools) {
    const context = { user: { isVerified: true, isAdmin: false } };
    const needsApproval = tool.needsApproval(context);
    const icon = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    }[tool.severity];

    console.log(
      `| ${tool.name.padEnd(12)} | ${icon} ${tool.severity.padEnd(8)} | ${needsApproval ? '✅ Yes' : '❌ No'.padEnd(14)} |`
    );
  }
}

// ============================================
// EXAMPLE 6: Role-Based Approvals
// ============================================

async function roleBasedExample() {
  console.log('\n=== EXAMPLE 6: Role-Based Approvals ===\n');

  const deployTool = toolWithApproval({
    description: 'Deploy application',
    inputSchema: z.object({
      environment: z.enum(['dev', 'staging', 'production']),
    }),
    
    needsApproval: (context, args) => {
      const { user } = context;
      const { environment } = args;

      // Production requires DevOps role
      if (environment === 'production') {
        return !user.roles.includes('devops');
      }

      // Staging requires Developer role
      if (environment === 'staging') {
        return !user.roles.includes('developer');
      }

      // Dev is open to all
      return false;
    },
    
    approvalMetadata: {
      severity: 'high',
      category: 'deployment',
      requiredRole: 'devops',
    },
    
    execute: async ({ environment }) => {
      return { deployed: true, environment };
    },
  });

  const scenarios = [
    {
      name: 'Junior Dev deploying to Dev',
      user: { roles: ['junior'] },
      environment: 'dev' as const,
    },
    {
      name: 'Developer deploying to Staging',
      user: { roles: ['developer'] },
      environment: 'staging' as const,
    },
    {
      name: 'Developer deploying to Production',
      user: { roles: ['developer'] },
      environment: 'production' as const,
    },
    {
      name: 'DevOps deploying to Production',
      user: { roles: ['devops'] },
      environment: 'production' as const,
    },
  ];

  console.log('Role-Based Approval Matrix:\n');

  for (const scenario of scenarios) {
    const needsApproval = await (deployTool.needsApproval as any)(
      { user: scenario.user },
      { environment: scenario.environment },
      'test-id'
    );

    console.log(`${scenario.name}:`);
    console.log(`  Needs approval: ${needsApproval ? '✅ YES' : '❌ NO'}\n`);
  }
}

// ============================================
// RUN EXAMPLES
// ============================================

async function main() {
  try {
    await basicDynamicApprovalExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await multipleApprovalPoliciesExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await approvalManagerExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // await interactiveApprovalExample(); // Skip in automated runs
    
    await severityBasedExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await roleBasedExample();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };

