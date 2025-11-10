# Testing Guide

## Quick Start

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Run all tests:**
   ```bash
   npm test
   ```

## Environment Setup

### Required API Keys

```bash
# OpenAI (Required for most tests)
OPENAI_API_KEY=sk-...

# Langfuse (Required for tracing tests)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

### Optional API Keys

```bash
# For testing multiple providers
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

## Running Tests

### Run All Tests
```bash
npm test
# or
./run-tests.sh
```

### Run Individual Tests
```bash
# Basic functionality
npx ts-node tests/01-basic-agent.test.ts

# Multi-agent coordination
npx ts-node tests/02-multi-agent.test.ts

# Streaming responses
npx ts-node tests/03-streaming.test.ts

# Guardrails & safety
npx ts-node tests/04-guardrails.test.ts

# Session management
npx ts-node tests/05-sessions.test.ts

# Langfuse tracing
npx ts-node tests/06-langfuse-tracing.test.ts

# Structured output
npx ts-node tests/09-structured-output.test.ts

# Error handling
npx ts-node tests/10-error-handling.test.ts

# Complete integration
npx ts-node tests/11-complete-integration.test.ts

# Complex real-world scenarios
npx ts-node tests/12-complex-scenarios.test.ts
```

## Test Coverage

### Core Features

| Test File | Coverage | What It Tests |
|-----------|----------|---------------|
| `01-basic-agent.test.ts` | Basic Agent | Tool calling, context injection, basic workflows |
| `02-multi-agent.test.ts` | Multi-Agent | Agent handoffs, specialized agents, coordination |
| `03-streaming.test.ts` | Streaming | Real-time responses, token streaming |
| `04-guardrails.test.ts` | Safety | Input validation, PII detection, content safety |
| `05-sessions.test.ts` | Sessions | Memory management, Redis, MongoDB backends |
| `06-langfuse-tracing.test.ts` | Observability | Automatic tracing, spans, generations |
| `09-structured-output.test.ts` | Parsing | Zod schema validation, typed responses |
| `10-error-handling.test.ts` | Errors | Graceful degradation, error recovery |
| `11-complete-integration.test.ts` | Integration | End-to-end workflows |
| `12-complex-scenarios.test.ts` | Real-World | Shopping cart, permissions, concurrency |

### Complex Scenarios (Test 12)

This test validates real-world production scenarios:

1. **Multi-Agent Shopping Workflow**
   - Context passing to tools
   - Cart state management
   - Agent coordination

2. **Session-Based Conversations**
   - Memory persistence
   - Context continuity
   - Multiple turns

3. **Permission-Based Security**
   - User role validation
   - Action authorization
   - Guardrails integration

4. **Streaming with Error Recovery**
   - Real-time responses
   - Graceful failures
   - Auto-recovery

5. **Concurrent Operations**
   - Multiple simultaneous requests
   - Resource management
   - Race condition handling

## Expected Results

### Success Criteria

✅ All tests should pass with:
- Function calls execute correctly
- Context is passed to tools automatically
- Token usage is tracked
- Langfuse traces are created
- No errors or warnings

### Performance Benchmarks

- **Average response time**: < 500ms
- **Streaming latency**: < 100ms first token
- **Context injection overhead**: < 5ms
- **Concurrent requests**: 10+ simultaneous

## Troubleshooting

### Common Issues

1. **Missing API Key**
   ```
   Error: OPENAI_API_KEY not found
   ```
   **Solution**: Add API key to `.env` file

2. **Langfuse Connection Failed**
   ```
   Error: Failed to connect to Langfuse
   ```
   **Solution**: Check `LANGFUSE_BASE_URL` and keys

3. **Context Not Available in Tools**
   ```
   Error: Cannot read properties of undefined
   ```
   **Solution**: Ensure using SDK version with context injection fix

4. **Rate Limits**
   ```
   Error: Rate limit exceeded
   ```
   **Solution**: Add delay between tests or use different API key tier

## Continuous Integration

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          LANGFUSE_PUBLIC_KEY: ${{ secrets.LANGFUSE_PUBLIC_KEY }}
          LANGFUSE_SECRET_KEY: ${{ secrets.LANGFUSE_SECRET_KEY }}
```

## Writing New Tests

### Template

```typescript
import { Agent, tool } from '../src';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

async function testNewFeature() {
  console.log('🧪 Testing: New Feature');
  
  try {
    // Your test code here
    
    console.log('✅ Test passed');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testNewFeature();
```

### Best Practices

1. **Use descriptive test names**
2. **Test one feature per file**
3. **Include error cases**
4. **Verify token usage**
5. **Check Langfuse traces**
6. **Clean up resources**

## Support

For issues or questions:
- 📖 Read the [API Documentation](./API.md)
- 💬 Open an issue on GitHub
- 📧 Contact support

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on adding new tests.
