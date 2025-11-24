/**
 * Test Suite Runner
 * 
 * Runs 6 core test suites in sequence and reports results:
 * 1. Basic Agent - Core functionality and tools
 * 2. Multi-Agent - Handoffs and coordination
 * 3. Streaming - Real-time responses
 * 4. Guardrails - Safety and validation
 * 5. Sessions - Session management
 * 6. Langfuse Tracing - Observability
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const tests = [
  { file: 'multi-agent.test.ts', name: 'Multi-Agent Tests' },
  { file: 'streaming.test.ts', name: 'Streaming Tests' },
  { file: 'guardrails.test.ts', name: 'Guardrails Tests' },
  { file: 'sessions.test.ts', name: 'Sessions Tests' },
  { file: 'tracing.test.ts', name: 'Tracing Tests' },
  { file: 'tool-calling.test.ts', name: 'Tool Calling Tests' },
  { file: 'race-agents.test.ts', name: 'Race Agents Tests' },
  { file: 'content-creation.test.ts', name: 'Content Creation Tests' },
];

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runTest(test: { file: string; name: string }): Promise<TestResult> {
  const start = Date.now();
  const testPath = path.join(__dirname, test.file);
  
  try {
    await execAsync(`npx ts-node ${testPath}`, {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env },
      timeout: 120000, // 2 minutes per test
    });
    
    return {
      name: test.name,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: test.name,
      passed: false,
      duration: Date.now() - start,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TAWK AGENTS SDK - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`\nRunning ${tests.length} test suites...\n`);

  const results: TestResult[] = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testNum = i + 1;
    
    console.log(`\n[${ testNum}/${tests.length}] Running ${test.name}...`);
    console.log('-'.repeat(80));
    
    const result = await runTest(test);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ PASSED in ${result.duration}ms`);
    } else {
      console.log(`❌ FAILED in ${result.duration}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error.substring(0, 100)}...`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('');

  // Individual results
  console.log('Individual Results:');
  results.forEach((result, i) => {
    const status = result.passed ? '✅' : '❌';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`  ${i + 1}. ${status} ${result.name.padEnd(35)} ${duration}`);
  });

  console.log('\n' + '='.repeat(80));

  if (passed === tests.length) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});

