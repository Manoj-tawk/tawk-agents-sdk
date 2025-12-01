/**
 * Test: Dynamic HITL Approvals
 * 
 * Tests the context-aware dynamic approval system.
 */

import { DynamicApprovalManager, ApprovalPolicies, toolWithApproval } from '../../dist/index';
import { z } from 'zod';

// Test 1: Approval Manager
async function testApprovalManager() {
  console.log('\n✅ TEST 1: Approval Manager');
  
  try {
    const manager = new DynamicApprovalManager();
    
    const tool = {
      description: 'Test tool',
      inputSchema: z.object({ value: z.number() }),
      needsApproval: (context: any, args: any) => args.value > 100,
      execute: async ({ value }: { value: number }) => value * 2,
    };

    // Test checkNeedsApproval
    const needsApproval1 = await manager.checkNeedsApproval(tool, {}, { value: 50 }, 'call-1');
    console.log(`   ✓ Small value (50): needs approval = ${needsApproval1} (expected: false)`);
    
    const needsApproval2 = await manager.checkNeedsApproval(tool, {}, { value: 150 }, 'call-2');
    console.log(`   ✓ Large value (150): needs approval = ${needsApproval2} (expected: true)`);
    
    // Test createApprovalRequest
    const request = manager.createApprovalRequest('testTool', tool, { value: 150 }, 'call-3', {});
    console.log(`   ✓ Approval request created: ${request.toolName}`);
    
    // Test approve
    manager.approve('call-3');
    const pending = manager.getPendingApprovals();
    console.log(`   ✓ Pending approvals after approve: ${pending.length} (expected: 0)`);
    
    // Test history
    const history = manager.getHistory();
    console.log(`   ✓ Approval history: ${history.length} items`);
    
    return needsApproval1 === false && needsApproval2 === true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Test 2: Approval Policies
async function testApprovalPolicies() {
  console.log('\n✅ TEST 2: Approval Policies');
  
  try {
    // Test requireAdminRole
    const adminPolicy = ApprovalPolicies.requireAdminRole('admin');
    const user1 = { user: { roles: ['admin'] } };
    const user2 = { user: { roles: ['user'] } };
    
    const adminNeeds1 = await adminPolicy(user1, {}, 'call-1');
    const adminNeeds2 = await adminPolicy(user2, {}, 'call-2');
    
    console.log(`   ✓ Admin user: needs approval = ${adminNeeds1} (expected: false)`);
    console.log(`   ✓ Regular user: needs approval = ${adminNeeds2} (expected: true)`);
    
    // Test requireForArgs
    const amountPolicy = ApprovalPolicies.requireForArgs((args: any) => args.amount > 1000);
    const argNeeds1 = await amountPolicy({}, { amount: 500 }, 'call-3');
    const argNeeds2 = await amountPolicy({}, { amount: 2000 }, 'call-4');
    
    console.log(`   ✓ Small amount (500): needs approval = ${argNeeds1} (expected: false)`);
    console.log(`   ✓ Large amount (2000): needs approval = ${argNeeds2} (expected: true)`);
    
    // Test combined policies (any)
    const combinedPolicy = ApprovalPolicies.any(adminPolicy, amountPolicy);
    const combined1 = await combinedPolicy(user1, { amount: 500 }, 'call-5');
    const combined2 = await combinedPolicy(user2, { amount: 2000 }, 'call-6');
    
    console.log(`   ✓ Admin + small amount: needs approval = ${combined1} (expected: false)`);
    console.log(`   ✓ Regular user + large amount: needs approval = ${combined2} (expected: true)`);
    
    return adminNeeds1 === false && adminNeeds2 === true && argNeeds1 === false && argNeeds2 === true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Test 3: Tool with Approval
async function testToolWithApproval() {
  console.log('\n✅ TEST 3: Tool with Approval');
  
  try {
    const deleteTool = toolWithApproval({
      description: 'Delete file',
      inputSchema: z.object({
        path: z.string(),
      }),
      
      needsApproval: (context: any, args: any) => {
        if (context.user?.isAdmin) return false;
        if (args.path.startsWith('/system/')) return true;
        return false;
      },
      
      approvalMetadata: {
        severity: 'high',
        category: 'file_operations',
      },
      
      execute: async ({ path }: { path: string }) => {
        return { deleted: path };
      },
    });

    console.log(`   ✓ Tool created: ${deleteTool.description}`);
    console.log(`   ✓ needsApproval function exists: ${typeof deleteTool.needsApproval === 'function'}`);
    console.log(`   ✓ approvalMetadata exists: ${deleteTool.approvalMetadata?.severity === 'high'}`);
    console.log(`   ✓ execute function exists: ${typeof deleteTool.execute === 'function'}`);
    
    // Test needsApproval logic
    if (deleteTool.needsApproval) {
      const admin = { user: { isAdmin: true } };
      const user = { user: { isAdmin: false } };
      
      const adminNeedsApproval = await deleteTool.needsApproval(admin, { path: '/tmp/file.txt' }, 'call-1');
      const userNeedsApproval = await deleteTool.needsApproval(user, { path: '/tmp/file.txt' }, 'call-2');
      const systemNeedsApproval = await deleteTool.needsApproval(user, { path: '/system/important.txt' }, 'call-3');
      
      console.log(`   ✓ Admin deleting /tmp file: needs approval = ${adminNeedsApproval} (expected: false)`);
      console.log(`   ✓ User deleting /tmp file: needs approval = ${userNeedsApproval} (expected: false)`);
      console.log(`   ✓ User deleting /system file: needs approval = ${systemNeedsApproval} (expected: true)`);
      
      return adminNeedsApproval === false && userNeedsApproval === false && systemNeedsApproval === true;
    }
    
    return true;
  } catch (error) {
    console.error('   ✗ Error:', error);
    return false;
  }
}

// Run tests
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  DYNAMIC HITL APPROVALS TESTS');
  console.log('═══════════════════════════════════════');

  const results = {
    test1: await testApprovalManager(),
    test2: await testApprovalPolicies(),
    test3: await testToolWithApproval(),
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`Test 1 (Approval Manager): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Approval Policies): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Tool with Approval): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

