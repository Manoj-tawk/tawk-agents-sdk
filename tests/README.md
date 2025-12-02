# 🧪 Tawk Agents SDK - Test Suite

Comprehensive test suite organized to match the source code structure.

**Status**: ✅ **Fully aligned with `src/`** - See [TEST_ALIGNMENT_REPORT.md](../TEST_ALIGNMENT_REPORT.md)

---

## 📁 Directory Structure

```
tests/
├── README.md                 # This file
├── STRUCTURE.md              # Structure documentation
├── TEST_SUMMARY.md           # Test results summary
│
├── e2e/                      # End-to-end tests (real API)
│   ├── 01-basic-e2e.test.ts
│   ├── 02-multi-agent-e2e.test.ts
│   ├── 03-streaming-sessions-e2e.test.ts
│   ├── 04-agentic-rag-e2e.test.ts
│   ├── 05-ecommerce-refund-escalation-e2e.test.ts
│   ├── 06-comprehensive-issues-solution-e2e.test.ts
│   ├── 07-multi-agent-research.test.ts
│   ├── 08-toon-optimization.test.ts
│   ├── 09-parallel-handoffs-pinecone.test.ts
│   ├── 10-runstate-approvals.test.ts
│   ├── 11-complete-features.test.ts
│   ├── 12-comprehensive-sdk.test.ts
│   ├── 13-tool-tracing.test.ts
│   └── README.md
│
├── integration/              # Integration tests (real API)
│   ├── content-creation.test.ts
│   ├── guardrails.test.ts
│   ├── incremental.test.ts
│   ├── multi-agent.test.ts
│   ├── race-agents.test.ts
│   ├── sessions.test.ts
│   ├── streaming.test.ts
│   ├── tool-calling.test.ts
│   ├── tracing.test.ts
│   ├── run-all-tests.ts
│   └── README.md
│
├── manual/                   # Manual tests (interactive)
│   ├── test-parallel-tools.ts
│   ├── test-true-parallel.ts
│   ├── test-multi-agent.ts
│   ├── test-dynamic-approvals.ts
│   ├── test-native-mcp.ts
│   └── README.md
│
└── utils/                    # Test utilities
    ├── helpers.ts           # Test helpers and mocks
    ├── setup.ts             # Jest setup
    ├── toon-format.ts       # TOON format utilities
    └── index.ts             # Exports
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# For E2E/integration/manual tests (API keys required)
cp .env.example .env
# Edit .env with your API keys:
#   OPENAI_API_KEY=sk-...
#   ANTHROPIC_API_KEY=sk-ant-... (optional)
#   LANGFUSE_PUBLIC_KEY=pk-... (optional)
#   LANGFUSE_SECRET_KEY=sk-... (optional)
```

### Running Tests

```bash
# Run all E2E tests
npm run e2e

# Run specific E2E test
npx tsx tests/e2e/01-basic-e2e.test.ts
npx tsx tests/e2e/02-multi-agent-e2e.test.ts

# Run all integration tests
npx tsx tests/integration/run-all-tests.ts

# Run specific integration test
npx tsx tests/integration/tool-calling.test.ts

# Run manual tests (interactive/debugging)
npx tsx tests/manual/test-parallel-tools.ts
npx tsx tests/manual/test-multi-agent.ts
```

---

## 📖 Test Categories

### E2E Tests (`e2e/`)

**For:** Comprehensive validation with real API calls

- **Speed**: 3-5 seconds per test
- **Requirements**: API keys required
- **Responses**: Real API calls
- **Results**: Non-deterministic (LLM varies)
- **Cost**: ~$0.01 for all tests

**13 Test Files:**
1. Basic agent functionality
2. Multi-agent handoffs
3. Streaming & sessions
4. Agentic RAG patterns
5. E-commerce workflows
6. Issue resolution
7. Multi-agent research
8. TOON optimization
9. Parallel handoffs (Pinecone)
10. RunState & approvals
11. Complete features showcase
12. Comprehensive SDK test
13. Tool tracing validation

### Integration Tests (`integration/`)

**For:** Fast integration validation

- **Speed**: 1-3 seconds per test
- **Requirements**: API keys required
- **Responses**: Real API calls
- **Results**: Semi-deterministic
- **Cost**: ~$0.05 for all tests

**9 Test Files:**
- Content creation tools
- Guardrails validation
- Incremental features
- Multi-agent patterns
- Race agents coordination
- Session management
- Streaming features
- Tool calling scenarios
- Tracing features

### Manual Tests (`manual/`)

**For:** Interactive testing & debugging

- **Speed**: Varies (user interaction)
- **Requirements**: API keys + user/services
- **Responses**: Real API calls
- **Results**: Visual verification
- **Cost**: Varies

**5 Test Files:**
- Parallel tool execution (with timestamps)
- True parallel validation
- Multi-agent coordination
- Dynamic HITL approvals (interactive)
- MCP integration (requires MCP server)

---

## 🧪 Test Coverage by Category

### E2E Tests (`e2e/`)

Comprehensive end-to-end validation with real API calls:

- ✅ **01-basic-e2e.test.ts** - Core agent features
- ✅ **02-multi-agent-e2e.test.ts** - Multi-agent handoffs
- ✅ **03-streaming-sessions-e2e.test.ts** - Streaming & sessions
- ✅ **04-agentic-rag-e2e.test.ts** - RAG patterns
- ✅ **05-ecommerce-refund-escalation-e2e.test.ts** - E-commerce workflows
- ✅ **06-comprehensive-issues-solution-e2e.test.ts** - Issue resolution
- ✅ **07-multi-agent-research.test.ts** - Research coordination
- ✅ **08-toon-optimization.test.ts** - TOON encoding
- ✅ **09-parallel-handoffs-pinecone.test.ts** - Parallel handoffs (Pinecone)
- ✅ **10-runstate-approvals.test.ts** - RunState & HITL approvals
- ✅ **11-complete-features.test.ts** - Complete feature showcase
- ✅ **12-comprehensive-sdk.test.ts** - Full SDK coverage
- ✅ **13-tool-tracing.test.ts** - Tool call tracing

### Integration Tests (`integration/`)

Fast integration tests with real API calls:

- ✅ **content-creation.test.ts** - AI tools (embeddings, images, audio)
- ✅ **guardrails.test.ts** - Input/output validation
- ✅ **incremental.test.ts** - Incremental features
- ✅ **multi-agent.test.ts** - Multi-agent patterns
- ✅ **race-agents.test.ts** - Agent racing & fallbacks
- ✅ **sessions.test.ts** - Session management
- ✅ **streaming.test.ts** - Streaming features
- ✅ **tool-calling.test.ts** - Tool execution scenarios
- ✅ **tracing.test.ts** - Tracing & observability

### Manual Tests (`manual/`)

Interactive tests for development & debugging:

- ✅ **test-parallel-tools.ts** - Parallel tool execution
- ✅ **test-true-parallel.ts** - Millisecond-level parallel validation
- ✅ **test-multi-agent.ts** - Multi-agent coordination (3 patterns)
- ✅ **test-dynamic-approvals.ts** - Dynamic HITL approvals (requires user)
- ✅ **test-native-mcp.ts** - MCP integration (requires MCP server)

---

## 🛠️ Test Utilities

Located in `utils/` folder:

### `helpers.ts`
- Test helper functions
- Mock utilities (if needed)
- Common test patterns

### `setup.ts`
- Test environment setup
- Global configuration
- Environment variable handling

### `toon-format.ts`
- TOON format encoding utilities
- Used by TOON optimization tests

### `index.ts`
- Exports all utilities
- Single import point

**Usage:**
```typescript
import { /* utilities */ } from '../utils';
```

---

## 📋 Test Standards

### File Naming

- E2E tests: `XX-name.test.ts` (numbered, sequential)
- Integration tests: `name.test.ts` (descriptive)
- Manual tests: `test-name.ts` (prefixed)

### Import Paths

```typescript
// SDK imports
import { Agent, run, tool } from '../../src';
import { openai } from '@ai-sdk/openai';

// Utility imports
import { /* helpers */ } from '../utils';
```

### Test Structure

```typescript
import 'dotenv/config';
import { Agent, run } from '../../src';
import { openai } from '@ai-sdk/openai';

async function testFeature() {
  console.log('Testing feature...');
  
  const agent = new Agent({
    name: 'TestAgent',
    instructions: 'Test instructions',
    model: openai('gpt-4o-mini'),
  });
  
  const result = await run(agent, 'Test input');
  console.log('Result:', result.finalOutput);
}

testFeature().catch(console.error);
```

---

## 🎯 Feature Coverage

### Core Features
- ✅ Agent creation & execution
- ✅ Tool calling (parallel & sequential)
- ✅ Multi-agent handoffs & coordination
- ✅ Streaming responses
- ✅ Session management
- ✅ Context injection
- ✅ Guardrails (input/output validation)
- ✅ HITL approvals & interruptions
- ✅ RunState management
- ✅ TOON encoding optimization

### Advanced Features
- ✅ RAG patterns (with/without Pinecone)
- ✅ Agent-as-tools pattern
- ✅ Parallel handoffs (runParallel)
- ✅ Race agents coordination
- ✅ Langfuse tracing
- ✅ Tool call tracing
- ✅ E-commerce workflows
- ✅ Issue resolution patterns
- ✅ MCP integration
- ✅ Dynamic approvals

### Agentic Patterns
- ✅ Agents-as-tools (coordinator pattern)
- ✅ Sequential handoffs (routing)
- ✅ Parallel handoffs (explicit coordination)
- ✅ Nested agent execution
- ✅ Race agents (fastest wins)

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Required for all tests
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Optional (for tracing)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Optional (for Pinecone tests)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...
```

### Running Specific Tests

```bash
# Run single E2E test
npx tsx tests/e2e/01-basic-e2e.test.ts

# Run single integration test
npx tsx tests/integration/tool-calling.test.ts

# Run single manual test
npx tsx tests/manual/test-parallel-tools.ts

# Run all integration tests
npx tsx tests/integration/run-all-tests.ts
```

---

## 📊 Test Comparison

| Type | Files | Speed | Cost | Network | API Keys | Purpose |
|------|-------|-------|------|---------|----------|---------|
| **E2E** | 13 | 🏃 3-5s | ~$0.01 | ✅ Yes | ✅ Yes | Comprehensive validation |
| **Integration** | 9 | ⚡ 1-3s | ~$0.05 | ✅ Yes | ✅ Yes | Fast integration checks |
| **Manual** | 5 | 🐌 Varies | Varies | ✅ Yes | ✅ Yes | Interactive/debugging |

**Total: 27 test files**

---

## 💡 Best Practices

1. **Organized Structure** - Tests grouped by type (e2e, integration, manual)
2. **Consistent Naming** - Numbered e2e tests, descriptive integration tests
3. **Real API Calls** - All tests validate against actual LLM responses
4. **Proper Documentation** - Each test folder has README
5. **Keep Tests Updated** - Tests aligned with source code
6. **Test All Features** - Comprehensive coverage of SDK capabilities

---

## 🐛 Troubleshooting

### Common Issues

**"Module not found"**
- Check import paths: `from '../../src'`
- Verify `npm install` was run

**"API key missing"**
- All tests require `OPENAI_API_KEY`
- Create `.env` file in project root
- Copy from `.env.example` if available

**"Pinecone test fails"**
- Test 09 requires Pinecone setup
- Set `PINECONE_API_KEY` and `PINECONE_INDEX_NAME`
- Skip if not using Pinecone: Just run other tests

**"Test timeout"**
- Some tests may take 10-30 seconds
- LLM responses can be slow
- Increase timeout if needed

**"MCP test fails"**
- `test-native-mcp.ts` requires MCP server running
- Start MCP server before running test
- See MCP documentation for setup

---

## 📚 Related Resources

- **[Examples](../examples/)** - Code examples
- **[Documentation](../docs/)** - Complete documentation
- **[Source Code](../src/)** - Source code structure

---

## 🤝 Contributing

### Adding Tests

1. **Choose Location**
   - E2E: For comprehensive feature validation
   - Integration: For focused integration checks
   - Manual: For interactive/debugging tests

2. **Follow Naming**
   - E2E: `XX-descriptive-name.test.ts` (numbered)
   - Integration: `feature-name.test.ts`
   - Manual: `test-feature-name.ts`

3. **Use Utilities**
   - Import from `../utils/`
   - Follow existing patterns

4. **Update README**
   - Document new tests
   - Update file counts

### Test Template (E2E)

```typescript
import 'dotenv/config';
import { Agent, run, tool } from '../../src';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

console.log('🧪 Testing Feature Name\n');

const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({
    param: z.string(),
  }),
  execute: async ({ param }) => {
    return `Result for ${param}`;
  },
});

async function testFeature() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST: Feature Description');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agent = new Agent({
    name: 'TestAgent',
    instructions: 'Agent instructions',
    tools: { myTool },
    model: openai('gpt-4o-mini'),
  });

  const result = await run(agent, 'Test input');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Final output:', result.finalOutput);
  console.log('✅ Test completed successfully!');
}

testFeature().catch(console.error);
```

---

## 📝 License

MIT © [Tawk.to](https://www.tawk.to)

---

**Ready to test? Start with `npm test`!** 🧪
