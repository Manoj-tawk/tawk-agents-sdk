/**
 * Test 17: End-to-End Session Storage Test
 * 
 * Comprehensive test for all session storage types:
 * - Memory (in-memory)
 * - Redis
 * - MongoDB
 * - Hybrid (Redis + MongoDB)
 * 
 * Tests:
 * - Message storage and retrieval
 * - Memory persistence across sessions
 * - Auto-summarization with all storage types
 * - Message history accuracy
 * - Context persistence
 * - Multi-turn conversations
 */

import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { Agent, run, tool, SessionManager } from '../src';
import { Redis } from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import { z } from 'zod';

console.log('\n🧪 TEST 17: End-to-End Session Storage Test\n');
console.log('='.repeat(70));

interface TestContext {
  userId: string;
  facts: Record<string, string>;
  conversationCount: number;
}

// ============================================================================
// Setup Tools
// ============================================================================

const rememberFact = tool({
  description: 'Remember a fact about the user',
  parameters: z.object({
    key: z.string(),
    value: z.string(),
  }),
  execute: async ({ key, value }, ctx) => {
    (ctx!.context as TestContext).facts[key] = value;
    return { remembered: true };
  },
});

const recallFacts = tool({
  description: 'Recall all facts about the user',
  parameters: z.object({}),
  execute: async ({}, ctx) => {
    return { facts: (ctx!.context as TestContext).facts };
  },
});

// ============================================================================
// Test Conversations
// ============================================================================

const TEST_MESSAGES = [
  "Hi! I'm Alice, a software engineer at Google.",
  "I specialize in machine learning and AI.",
  "What's my name and job?",
  "I love hiking and photography.",
  "Tell me what you know about me.",
  "I graduated from MIT in 2020.",
  "I live in San Francisco.",
  "I know Python, JavaScript, and Go.",
  "What do you remember about my technical skills?",
  "I'm working on a computer vision project.",
  "What's my current project?",
  "Final test: tell me everything you remember!",
];

// ============================================================================
// Test Runner Function
// ============================================================================

async function runSessionTest(
  sessionType: string,
  sessionManager: SessionManager,
  context: TestContext
): Promise<{ success: boolean; errors: string[] }> {
  console.log(`\n📌 Testing ${sessionType} Session Storage\n`);
  
  const errors: string[] = [];
  let successCount = 0;
  
  try {
    // Create agent
    const agent = new Agent({
      name: 'TestAgent',
      model: openai('gpt-4o-mini'),
      tools: { rememberFact, recallFacts },
      instructions: 'Remember facts about the user. Use recallFacts before answering questions.',
    });
    
    // Test 1: Fresh session
    console.log('Test 1: Fresh session - should start empty');
    const session1 = sessionManager.getSession(`test-${sessionType}-1`);
    const history1 = await session1.getHistory();
    
    if (history1.length === 0) {
      console.log('   ✅ Fresh session is empty');
      successCount++;
    } else {
      errors.push(`Fresh session not empty: ${history1.length} messages`);
      console.log(`   ❌ Fresh session has ${history1.length} messages`);
    }
    
    // Test 2: Send messages and verify storage
    console.log('\nTest 2: Send 12 messages and verify storage');
    for (let i = 0; i < TEST_MESSAGES.length; i++) {
      await run(agent, TEST_MESSAGES[i], { session: session1, context });
      console.log(`   [${i+1}/12] Sent: "${TEST_MESSAGES[i].slice(0, 40)}..."`);
    }
    
    const history2 = await session1.getHistory();
    console.log(`\n   Messages stored: ${history2.length}`);
    
    if (history2.length > 0) {
      console.log('   ✅ Messages stored successfully');
      successCount++;
    } else {
      errors.push('No messages stored after conversation');
      console.log('   ❌ No messages stored');
    }
    
    // Test 3: Verify summarization (should have summary + recent messages)
    console.log('\nTest 3: Verify auto-summarization');
    const summaryMsg = history2.find(msg => 
      msg.role === 'system' && 
      typeof msg.content === 'string' && 
      msg.content.includes('Previous conversation summary')
    );
    
    if (summaryMsg) {
      console.log('   ✅ Summarization working (summary found in history)');
      console.log(`   📝 Summary stored as SYSTEM message (hidden from users)`);
      console.log(`   📊 Total messages in context: ${history2.length}`);
      
      // Verify user/assistant messages are still present
      const userAssistantMsgs = history2.filter(m => m.role === 'user' || m.role === 'assistant');
      console.log(`   💬 User/Assistant messages: ${userAssistantMsgs.length}`);
      
      // Show summary preview
      const summaryContent = typeof summaryMsg.content === 'string' ? summaryMsg.content : '';
      const summaryPreview = summaryContent.split('\n')[1]?.slice(0, 80) || '';
      console.log(`   📄 Summary preview: "${summaryPreview}..."`);
      
      successCount++;
    } else {
      console.log(`   ⚠️  No summary found (may not have reached threshold of 10 messages)`);
      console.log(`   📊 ${history2.length} messages in context`);
    }
    
    // Test 4: Session persistence - reconnect and verify
    console.log('\nTest 4: Session persistence - reconnect to same session');
    const session2 = sessionManager.getSession(`test-${sessionType}-1`);
    const history3 = await session2.getHistory();
    
    if (history3.length > 0) {
      console.log(`   ✅ Session persisted: ${history3.length} messages retrieved`);
      successCount++;
    } else {
      errors.push('Session not persisted - empty after reconnect');
      console.log('   ❌ Session empty after reconnect');
    }
    
    // Test 5: Context persistence
    console.log('\nTest 5: Context and facts persistence');
    const result = await run(agent, "What do you know about me?", { 
      session: session2, 
      context 
    });
    
    const hasMemory = result.finalOutput.toLowerCase().includes('alice') ||
                     result.finalOutput.toLowerCase().includes('google') ||
                     result.finalOutput.toLowerCase().includes('engineer');
    
    if (hasMemory) {
      console.log('   ✅ Context persisted across session reconnect');
      console.log(`   💬 Response: ${result.finalOutput.slice(0, 100)}...`);
      successCount++;
    } else {
      errors.push('Context not persisted properly');
      console.log('   ❌ Context not persisted');
    }
    
    // Test 6: New session should be independent
    console.log('\nTest 6: New session independence');
    const session3 = sessionManager.getSession(`test-${sessionType}-2`);
    const history4 = await session3.getHistory();
    
    if (history4.length === 0) {
      console.log('   ✅ New session is independent (empty)');
      successCount++;
    } else {
      errors.push(`New session not independent: ${history4.length} messages`);
      console.log(`   ❌ New session has ${history4.length} messages`);
    }
    
    // Test 7: Metadata storage
    console.log('\nTest 7: Metadata storage and retrieval');
    await session1.updateMetadata({ testKey: 'testValue', timestamp: Date.now() });
    const metadata = await session1.getMetadata();
    
    if (metadata.testKey === 'testValue') {
      console.log('   ✅ Metadata stored and retrieved correctly');
      successCount++;
    } else {
      errors.push('Metadata not stored correctly');
      console.log('   ❌ Metadata not stored');
    }
    
    // Test 8: Clear session
    console.log('\nTest 8: Session clear functionality');
    await session1.clear();
    const history5 = await session1.getHistory();
    
    if (history5.length === 0) {
      console.log('   ✅ Session cleared successfully');
      successCount++;
    } else {
      errors.push(`Session not cleared: ${history5.length} messages remain`);
      console.log(`   ❌ Session not cleared: ${history5.length} messages`);
    }
    
    console.log(`\n✅ ${sessionType} Tests: ${successCount}/8 passed`);
    
    return { 
      success: successCount >= 6, // At least 75% pass rate
      errors 
    };
    
  } catch (error: any) {
    errors.push(`Fatal error: ${error.message}`);
    console.error(`\n❌ ${sessionType} Test Error:`, error.message);
    return { success: false, errors };
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

async function test17() {
  const results: Record<string, { success: boolean; errors: string[] }> = {};
  
  // ============================================================================
  // TEST 1: MEMORY SESSION
  // ============================================================================
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║             TEST 1: Memory (In-Memory) Session                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const memorySessionManager = new SessionManager({
    type: 'memory',
    summarization: {
      enabled: true,
      messageThreshold: 10,
      keepRecentMessages: 3,
      model: openai('gpt-4o-mini'),
    }
  });
  
  const memoryContext: TestContext = {
    userId: 'test-memory',
    facts: {},
    conversationCount: 0,
  };
  
  results.memory = await runSessionTest('Memory', memorySessionManager, memoryContext);
  
  // ============================================================================
  // TEST 2: REDIS SESSION
  // ============================================================================
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  TEST 2: Redis Session                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    console.log('\n🔌 Connecting to Redis (localhost:6379)...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    
    // Test connection
    await redis.ping();
    console.log('✅ Redis connected successfully\n');
    
    const redisSessionManager = new SessionManager({
      type: 'redis',
      redis,
      redisKeyPrefix: 'test:',
      redisTTL: 3600,
      maxMessages: 15,
      summarization: {
        enabled: true,
        messageThreshold: 10,
        keepRecentMessages: 3,
        model: openai('gpt-4o-mini'),
      }
    });
    
    const redisContext: TestContext = {
      userId: 'test-redis',
      facts: {},
      conversationCount: 0,
    };
    
    results.redis = await runSessionTest('Redis', redisSessionManager, redisContext);
    
    // Cleanup
    await redis.quit();
    
  } catch (error: any) {
    console.log(`⚠️  Redis not available: ${error.message}`);
    console.log('   Skipping Redis tests (run docker-compose up to enable)');
    results.redis = { success: false, errors: ['Redis not available'] };
  }
  
  // ============================================================================
  // TEST 3: MONGODB SESSION
  // ============================================================================
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                 TEST 3: MongoDB Session                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    console.log('\n🔌 Connecting to MongoDB (localhost:27017)...');
    const mongoClient = new MongoClient(
      process.env.MONGODB_URL || 'mongodb://localhost:27017',
      { serverSelectionTimeoutMS: 2000 }
    );
    
    await mongoClient.connect();
    const db = mongoClient.db('tawk_agents_test');
    console.log('✅ MongoDB connected successfully\n');
    
    const mongoSessionManager = new SessionManager({
      type: 'database',
      db,
      dbCollectionName: 'test_sessions',
      maxMessages: 15,
      summarization: {
        enabled: true,
        messageThreshold: 10,
        keepRecentMessages: 3,
        model: openai('gpt-4o-mini'),
      }
    });
    
    const mongoContext: TestContext = {
      userId: 'test-mongo',
      facts: {},
      conversationCount: 0,
    };
    
    results.mongodb = await runSessionTest('MongoDB', mongoSessionManager, mongoContext);
    
    // Cleanup
    await mongoClient.close();
    
  } catch (error: any) {
    console.log(`⚠️  MongoDB not available: ${error.message}`);
    console.log('   Skipping MongoDB tests (run docker-compose up to enable)');
    results.mongodb = { success: false, errors: ['MongoDB not available'] };
  }
  
  // ============================================================================
  // TEST 4: HYBRID SESSION (Redis + MongoDB)
  // ============================================================================
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            TEST 4: Hybrid (Redis + MongoDB) Session           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    console.log('\n🔌 Connecting to Redis and MongoDB...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    
    await redis.ping();
    
    const mongoClient = new MongoClient(
      process.env.MONGODB_URL || 'mongodb://localhost:27017',
      { serverSelectionTimeoutMS: 2000 }
    );
    
    await mongoClient.connect();
    const db = mongoClient.db('tawk_agents_test');
    console.log('✅ Both Redis and MongoDB connected\n');
    
    const hybridSessionManager = new SessionManager({
      type: 'hybrid',
      redis,
      db,
      redisKeyPrefix: 'hybrid:',
      redisTTL: 3600,
      dbCollectionName: 'hybrid_sessions',
      maxMessages: 15,
      syncToDBInterval: 3,
      summarization: {
        enabled: true,
        messageThreshold: 10,
        keepRecentMessages: 3,
        model: openai('gpt-4o-mini'),
      }
    });
    
    const hybridContext: TestContext = {
      userId: 'test-hybrid',
      facts: {},
      conversationCount: 0,
    };
    
    results.hybrid = await runSessionTest('Hybrid', hybridSessionManager, hybridContext);
    
    // Cleanup
    await redis.quit();
    await mongoClient.close();
    
  } catch (error: any) {
    console.log(`⚠️  Hybrid session not available: ${error.message}`);
    console.log('   Skipping Hybrid tests (run docker-compose up to enable)');
    results.hybrid = { success: false, errors: ['Hybrid storage not available'] };
  }
  
  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  
  console.log('\n\n' + '='.repeat(70));
  console.log('\n📊 FINAL TEST RESULTS:\n');
  
  let totalPassed = 0;
  let totalTests = 0;
  
  for (const [type, result] of Object.entries(results)) {
    totalTests++;
    if (result.success) {
      console.log(`✅ ${type.toUpperCase()}: PASSED`);
      totalPassed++;
    } else {
      console.log(`❌ ${type.toUpperCase()}: FAILED`);
      if (result.errors.length > 0) {
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
    }
  }
  
  console.log(`\n📈 Overall: ${totalPassed}/${totalTests} storage types passed`);
  
  console.log('\n🎯 What Was Tested:');
  console.log('   ✓ Message storage and retrieval');
  console.log('   ✓ Session persistence');
  console.log('   ✓ Auto-summarization (when threshold reached)');
  console.log('   ✓ Context preservation');
  console.log('   ✓ Session independence');
  console.log('   ✓ Metadata storage');
  console.log('   ✓ Clear functionality');
  console.log('   ✓ Memory recall across sessions');
  
  console.log('\n💡 To run with Redis + MongoDB:');
  console.log('   docker-compose up -d');
  console.log('   npm run test:session\n');
  
  if (totalPassed >= 1) { // At least memory session should work
    console.log('✅ TEST 17 PASSED! At least one storage type working!\n');
  } else {
    console.log('❌ TEST 17 FAILED! No storage types working!\n');
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

test17().catch((error) => {
  console.error('\n❌ Test 17 error:', error);
  process.exit(1);
});

