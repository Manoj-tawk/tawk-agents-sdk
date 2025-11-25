/**
 * E2E TEST 05: E-Commerce Refund Escalation with Human Handoff
 * 
 * @fileoverview
 * This test demonstrates an e-commerce customer support scenario where:
 * - Customer mentions "refund" → automatically triggers human escalation
 * - Customer support agent handles general queries
 * - Human escalation agent handles refund requests
 * 
 * Architecture:
 * 1. Customer Support Agent - Handles general customer queries
 * 2. Human Escalation Agent - Handles refund requests and escalates to human
 * 
 * Features:
 * - Automatic keyword detection (refund, return, money back)
 * - Human escalation workflow
 * - Multi-agent handoffs
 * - Context preservation during handoff
 * 
 * Requirements:
 * - OPENAI_API_KEY in .env
 * - Network connection
 * 
 * @example
 * ```bash
 * npx ts-node tests/e2e/05-ecommerce-refund-escalation-e2e.test.ts
 * ```
 */

import 'dotenv/config';
import {
  Agent,
  run,
  setDefaultModel,
  tool,
} from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Set model
setDefaultModel(openai('gpt-4o-mini'));

console.log('\n🧪 E2E TEST 05: E-Commerce Refund Escalation with Human Handoff\n');
console.log('⚠️  This test makes REAL API calls and costs money!\n');

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Result structure for escalation tests
 */
interface EscalationResult {
  response: string;
  escalated: boolean;
  handoffChain: string[];
  escalationReason?: string;
  totalTokens: number;
  latency: number;
}

// ============================================
// SIMULATED SERVICES
// ============================================

/**
 * Simulated order database
 */
const orderDatabase = new Map<string, {
  orderId: string;
  customerName: string;
  product: string;
  amount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
}>();

// Initialize with sample orders
orderDatabase.set('ORD-12345', {
  orderId: 'ORD-12345',
  customerName: 'John Doe',
  product: 'Wireless Headphones',
  amount: 99.99,
  status: 'delivered',
  orderDate: '2024-01-15',
});

orderDatabase.set('ORD-67890', {
  orderId: 'ORD-67890',
  customerName: 'Jane Smith',
  product: 'Smart Watch',
  amount: 249.99,
  status: 'shipped',
  orderDate: '2024-01-20',
});

/**
 * Simulated human escalation queue
 */
const escalationQueue: Array<{
  customerId: string;
  orderId?: string;
  reason: string;
  timestamp: string;
  context: string;
}> = [];

// ============================================
// AGENT DEFINITIONS
// ============================================

/**
 * Human Escalation Agent
 * 
 * This agent handles refund requests and escalates to human support.
 * It's designed to be triggered when the customer support agent detects
 * refund-related keywords or requests.
 */
const humanEscalationAgent = new Agent({
  name: 'HumanEscalation',
  instructions: `You are a human escalation specialist for refund requests.

CRITICAL RULES:
1. When a customer mentions refund, return, money back, or similar terms, you MUST escalate to human support
2. Collect relevant information: order ID, customer name, reason for refund
3. Use the escalateToHuman tool to create an escalation ticket
4. Provide a friendly, empathetic response acknowledging the customer's concern
5. Inform the customer that a human agent will contact them shortly
6. Be professional and reassuring

Your response should:
- Acknowledge the refund request
- Confirm that the request has been escalated
- Provide an estimated response time (e.g., "within 24 hours")
- Thank the customer for their patience

DO NOT attempt to process refunds yourself - always escalate to human support.`,
  tools: {
    escalateToHuman: tool({
      description: 'Escalate a refund request to human support team. Use this when customer mentions refund, return, or money back.',
      inputSchema: z.object({
        customerId: z.string().describe('Customer identifier or name'),
        orderId: z.string().optional().describe('Order ID if available'),
        reason: z.string().describe('Reason for escalation (e.g., "Refund request")'),
        context: z.string().describe('Full context of the conversation and refund request'),
      }),
      execute: async ({ customerId, orderId, reason, context }) => {
        const escalation = {
          customerId,
          orderId,
          reason,
          timestamp: new Date().toISOString(),
          context,
        };
        
        escalationQueue.push(escalation);
        
        console.log(`   🚨 ESCALATION CREATED:`);
        console.log(`      Customer: ${customerId}`);
        console.log(`      Order: ${orderId || 'N/A'}`);
        console.log(`      Reason: ${reason}`);
        console.log(`      Queue Position: ${escalationQueue.length}`);
        
        return {
          success: true,
          escalationId: `ESC-${Date.now()}`,
          queuePosition: escalationQueue.length,
          estimatedWaitTime: '24 hours',
          message: 'Refund request has been escalated to human support team',
        };
      },
    }),
    getOrderInfo: tool({
      description: 'Retrieve order information by order ID',
      inputSchema: z.object({
        orderId: z.string().describe('Order ID to look up'),
      }),
      execute: async ({ orderId }) => {
        const order = orderDatabase.get(orderId);
        if (!order) {
          return {
            found: false,
            message: `Order ${orderId} not found`,
          };
        }
        
        return {
          found: true,
          order: {
            orderId: order.orderId,
            customerName: order.customerName,
            product: order.product,
            amount: order.amount,
            status: order.status,
            orderDate: order.orderDate,
          },
        };
      },
    }),
  },
  handoffDescription: 'Handles refund requests and escalates to human support team',
});

/**
 * Customer Support Agent
 * 
 * Main customer support agent that handles general queries.
 * Automatically hands off to Human Escalation Agent when refund is mentioned.
 */
const customerSupportAgent = new Agent({
  name: 'CustomerSupport',
  instructions: `You are a helpful customer support agent for an e-commerce store.

YOUR RESPONSIBILITIES:
1. Answer general questions about products, orders, shipping, etc.
2. Help customers track orders
3. Provide information about return policies
4. Handle general inquiries

CRITICAL ESCALATION RULE:
- If a customer mentions "refund", "return", "money back", "get my money back", 
  "refund my order", or any similar refund-related request, you MUST immediately 
  hand off to the Human Escalation Agent using the handoff_to_human_escalation tool.
- Do NOT attempt to process refunds yourself
- Do NOT ask clarifying questions about refunds - just escalate immediately

For non-refund queries, you can:
- Use getOrderInfo to look up order details
- Answer questions about products
- Provide shipping information
- Help with account issues

Be friendly, professional, and helpful. Always prioritize customer satisfaction.`,
  tools: {
    getOrderInfo: tool({
      description: 'Retrieve order information by order ID',
      inputSchema: z.object({
        orderId: z.string().describe('Order ID to look up'),
      }),
      execute: async ({ orderId }) => {
        const order = orderDatabase.get(orderId);
        if (!order) {
          return {
            found: false,
            message: `Order ${orderId} not found`,
          };
        }
        
        console.log(`   📦 Order found: ${orderId}`);
        return {
          found: true,
          order: {
            orderId: order.orderId,
            customerName: order.customerName,
            product: order.product,
            amount: order.amount,
            status: order.status,
            orderDate: order.orderDate,
          },
        };
      },
    }),
  },
  handoffs: [humanEscalationAgent],
});

// ============================================
// ORCHESTRATION FUNCTION
// ============================================

/**
 * Process a customer query and handle refund escalation
 * 
 * @param query - Customer query
 * @param customerId - Customer identifier
 * @returns EscalationResult with response, escalation status, and metrics
 * 
 * @example
 * ```typescript
 * const result = await processCustomerQuery('I want a refund', 'customer-123');
 * console.log(result.escalated); // true
 * ```
 */
async function processCustomerQuery(
  query: string,
  customerId: string = 'customer-123'
): Promise<EscalationResult> {
  const startTime = Date.now();

  console.log(`\n📝 Customer Query: "${query}"`);
  console.log(`👤 Customer ID: ${customerId}`);
  console.log('━'.repeat(80));
  console.log('🚀 Processing customer support request...\n');

  // Run the customer support agent with context
  const result = await run(customerSupportAgent, query, {
    context: {
      customerId,
      timestamp: new Date().toISOString(),
    },
    maxTurns: 5, // Limit turns to prevent excessive loops
  });

  // Extract handoff chain
  const handoffChain = result.metadata.handoffChain || [];
  const escalated = handoffChain.includes('HumanEscalation');

  // Extract escalation reason if available
  let escalationReason: string | undefined;
  if (escalated) {
    const steps = (result as any).steps || [];
    for (const step of steps) {
      if (step.toolCalls) {
        for (const toolCall of step.toolCalls) {
          if (toolCall.toolName === 'escalateToHuman' && toolCall.args) {
            escalationReason = toolCall.args.reason || 'Refund request detected';
            break;
          }
        }
      }
    }
  }

  const latency = Date.now() - startTime;

  return {
    response: result.finalOutput,
    escalated,
    handoffChain,
    escalationReason,
    totalTokens: result.metadata.totalTokens || 0,
    latency,
  };
}

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Test Scenario 1: Direct Refund Request
 * 
 * Tests immediate escalation when customer directly asks for a refund.
 */
async function test1_DirectRefundRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 1: Direct Refund Request');
  console.log('='.repeat(80));

  const result = await processCustomerQuery(
    'I want a refund for my order ORD-12345',
    'customer-john'
  );

  console.log('\n✅ Results:');
  console.log(`📝 Response: ${result.response.substring(0, 200)}...`);
  console.log(`🚨 Escalated: ${result.escalated ? 'YES ✅' : 'NO ❌'}`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ') || 'None'}`);
  if (result.escalationReason) {
    console.log(`📋 Escalation Reason: ${result.escalationReason}`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  // Assert escalation occurred
  if (!result.escalated) {
    throw new Error('Expected escalation but none occurred');
  }

  return result;
}

/**
 * Test Scenario 2: Indirect Refund Request
 * 
 * Tests escalation when customer mentions refund indirectly.
 */
async function test2_IndirectRefundRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 2: Indirect Refund Request');
  console.log('='.repeat(80));

  const result = await processCustomerQuery(
    'I received a damaged product. Can I get my money back?',
    'customer-jane'
  );

  console.log('\n✅ Results:');
  console.log(`📝 Response: ${result.response.substring(0, 200)}...`);
  console.log(`🚨 Escalated: ${result.escalated ? 'YES ✅' : 'NO ❌'}`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ') || 'None'}`);
  if (result.escalationReason) {
    console.log(`📋 Escalation Reason: ${result.escalationReason}`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  // Assert escalation occurred
  if (!result.escalated) {
    throw new Error('Expected escalation but none occurred');
  }

  return result;
}

/**
 * Test Scenario 3: General Query (No Escalation)
 * 
 * Tests that general queries don't trigger escalation.
 */
async function test3_GeneralQuery() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 3: General Query (No Escalation Expected)');
  console.log('='.repeat(80));

  const result = await processCustomerQuery(
    'What is the status of my order ORD-12345?',
    'customer-bob'
  );

  console.log('\n✅ Results:');
  console.log(`📝 Response: ${result.response.substring(0, 200)}...`);
  console.log(`🚨 Escalated: ${result.escalated ? 'YES ⚠️' : 'NO ✅ (Expected)'}`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ') || 'None'}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  // Assert no escalation occurred
  if (result.escalated) {
    throw new Error('Unexpected escalation for general query');
  }

  return result;
}

/**
 * Test Scenario 4: Return Policy Question
 * 
 * Tests handling of return policy questions without escalation.
 */
async function test4_ReturnPolicyQuestion() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 4: Return Policy Question');
  console.log('='.repeat(80));

  const result = await processCustomerQuery(
    'What is your return policy?',
    'customer-alice'
  );

  console.log('\n✅ Results:');
  console.log(`📝 Response: ${result.response.substring(0, 200)}...`);
  console.log(`🚨 Escalated: ${result.escalated ? 'YES ⚠️' : 'NO ✅ (Expected)'}`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ') || 'None'}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 5: Multiple Refund Keywords
 * 
 * Tests escalation with various refund-related keywords.
 */
async function test5_MultipleRefundKeywords() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 5: Multiple Refund Keywords');
  console.log('='.repeat(80));

  const queries = [
    'I need to return this item and get a refund',
    'Can I get my money back?',
    'I want to return my purchase',
    'Refund my order please',
  ];

  const results: EscalationResult[] = [];

  for (const query of queries) {
    console.log(`\n   Testing: "${query}"`);
    const result = await processCustomerQuery(query, 'customer-test');
    results.push(result);
    
    if (!result.escalated) {
      console.log(`   ⚠️  Warning: Query "${query}" did not trigger escalation`);
    } else {
      console.log(`   ✅ Escalation triggered correctly`);
    }
  }

  const escalationRate = results.filter(r => r.escalated).length / results.length;
  console.log(`\n✅ Escalation Rate: ${(escalationRate * 100).toFixed(0)}%`);

  return results;
}

/**
 * Test Scenario 6: Complex Refund Request with Context
 * 
 * Tests escalation with a complex refund request that includes order details.
 */
async function test6_ComplexRefundRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 6: Complex Refund Request with Context');
  console.log('='.repeat(80));

  const result = await processCustomerQuery(
    'Hi, I ordered a Wireless Headphones (ORD-12345) last month but the product stopped working after 2 weeks. I would like to request a full refund as this is clearly a defective product. Can you help me with this?',
    'customer-john'
  );

  console.log('\n✅ Results:');
  console.log(`📝 Response: ${result.response.substring(0, 300)}...`);
  console.log(`🚨 Escalated: ${result.escalated ? 'YES ✅' : 'NO ❌'}`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ') || 'None'}`);
  if (result.escalationReason) {
    console.log(`📋 Escalation Reason: ${result.escalationReason}`);
  }
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  // Assert escalation occurred
  if (!result.escalated) {
    throw new Error('Expected escalation but none occurred');
  }

  // Check escalation queue
  console.log(`\n📋 Escalation Queue Status:`);
  console.log(`   Total Escalations: ${escalationQueue.length}`);
  if (escalationQueue.length > 0) {
    const latest = escalationQueue[escalationQueue.length - 1];
    console.log(`   Latest Escalation:`);
    console.log(`      Customer: ${latest.customerId}`);
    console.log(`      Order: ${latest.orderId || 'N/A'}`);
    console.log(`      Reason: ${latest.reason}`);
  }

  return result;
}

// ============================================
// TEST RUNNER
// ============================================

/**
 * Run all E2E test scenarios
 * 
 * Executes all 6 test scenarios and provides a summary with metrics.
 * Handles errors gracefully and exits with code 1 on failure.
 */
async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  let totalCost = 0;
  let totalTokens = 0;
  let totalEscalations = 0;

  try {
    // Clear escalation queue before tests
    escalationQueue.length = 0;

    // Run all scenarios
    const result1 = await test1_DirectRefundRequest();
    totalTokens += result1.totalTokens;
    totalCost += (result1.totalTokens * 0.00015) / 1000;
    if (result1.escalated) totalEscalations++;

    const result2 = await test2_IndirectRefundRequest();
    totalTokens += result2.totalTokens;
    totalCost += (result2.totalTokens * 0.00015) / 1000;
    if (result2.escalated) totalEscalations++;

    const result3 = await test3_GeneralQuery();
    totalTokens += result3.totalTokens;
    totalCost += (result3.totalTokens * 0.00015) / 1000;

    const result4 = await test4_ReturnPolicyQuestion();
    totalTokens += result4.totalTokens;
    totalCost += (result4.totalTokens * 0.00015) / 1000;

    const result5 = await test5_MultipleRefundKeywords();
    const result5Tokens = result5.reduce((sum, r) => sum + r.totalTokens, 0);
    const result5Cost = (result5Tokens * 0.00015) / 1000;
    totalTokens += result5Tokens;
    totalCost += result5Cost;
    totalEscalations += result5.filter(r => r.escalated).length;

    const result6 = await test6_ComplexRefundRequest();
    totalTokens += result6.totalTokens;
    totalCost += (result6.totalTokens * 0.00015) / 1000;
    if (result6.escalated) totalEscalations++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '━'.repeat(80));
    console.log('✅ ALL E-COMMERCE REFUND ESCALATION E2E TESTS COMPLETED!');
    console.log('━'.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📊 Total Tokens: ${totalTokens}`);
    console.log(`💰 Total Cost: ~$${totalCost.toFixed(6)}`);
    console.log(`🚨 Total Escalations: ${totalEscalations}`);
    console.log(`📋 Escalation Queue Size: ${escalationQueue.length}`);
    console.log(`📈 Average Latency: ${((Date.now() - startTime) / 6 / 1000).toFixed(2)}s per query`);
    console.log('━'.repeat(80) + '\n');

    // Display escalation queue summary
    if (escalationQueue.length > 0) {
      console.log('📋 Escalation Queue Summary:');
      escalationQueue.forEach((esc, index) => {
        console.log(`   ${index + 1}. Customer: ${esc.customerId}, Order: ${esc.orderId || 'N/A'}, Reason: ${esc.reason}`);
      });
      console.log();
    }

  } catch (error: any) {
    console.error('\n❌ E2E TEST FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================
// ENTRY POINT
// ============================================

// Validate environment
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in environment');
  console.error('💡 Create a .env file with: OPENAI_API_KEY=sk-...\n');
  process.exit(1);
}

// Run all tests
runAllTests();

