/**
 * E2E TEST 08: Multi-Agent Research Example Test
 * 
 * Tests the multi-agent-research.ts example to ensure it works correctly.
 * 
 * @example
 * ```bash
 * npx ts-node tests/e2e/08-multi-agent-research-example-e2e.test.ts
 * ```
 */

import 'dotenv/config';
import { runResearchSystem } from '../../examples/advanced/multi-agent-research';

console.log('\n🧪 E2E TEST 08: Multi-Agent Research Example Test\n');
console.log('⚠️  This test makes REAL API calls!\n');

async function testMultiAgentResearchExample() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found');
    process.exit(1);
  }

  console.log('📋 Testing Multi-Agent Research System...\n');
  console.log('━'.repeat(80));

  try {
    // Test with a simple query
    const query = 'What are the latest developments in quantum computing?';
    
    console.log(`\n🔬 Query: ${query}\n`);

    const result = await runResearchSystem(query, {
      tokenBudget: 50000,
      useCitations: true,
    });

    // Verify results
    console.log('\n' + '━'.repeat(80));
    console.log('✅ TEST RESULTS:');
    console.log('━'.repeat(80));
    console.log(`📄 Final Report Length: ${result.finalReport.length} characters`);
    console.log(`📚 Citations Found: ${result.citations.length}`);
    console.log(`🤖 Subagents Used: ${result.metadata.subagentsUsed}`);
    console.log(`🔧 Total Tool Calls: ${result.metadata.totalToolCalls}`);
    console.log(`📊 Total Tokens: ${result.metadata.totalTokens}`);
    console.log(`⏱️  Duration: ${(result.metadata.duration / 1000).toFixed(2)}s`);

    // Verify basic requirements
    const checks = {
      hasReport: result.finalReport.length > 0,
      hasSubagents: result.metadata.subagentsUsed > 0,
      hasToolCalls: result.metadata.totalToolCalls > 0,
      hasTokens: result.metadata.totalTokens > 0,
      hasDuration: result.metadata.duration > 0,
    };

    console.log('\n📋 Validation Checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed}`);
    });

    const allPassed = Object.values(checks).every(v => v);

    if (allPassed) {
      console.log('\n' + '━'.repeat(80));
      console.log('🎉 ALL TESTS PASSED!');
      console.log('━'.repeat(80) + '\n');
      
      // Show sample of report
      console.log('📄 Sample Report (first 500 chars):');
      console.log(result.finalReport.substring(0, 500) + '...\n');
      
      return true;
    } else {
      console.log('\n' + '━'.repeat(80));
      console.log('❌ SOME TESTS FAILED');
      console.log('━'.repeat(80) + '\n');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Run test
testMultiAgentResearchExample()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

