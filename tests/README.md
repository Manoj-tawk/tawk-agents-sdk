# Tawk Agents SDK - Comprehensive Test Suite

This test suite covers all features and scenarios of the Tawk Agents SDK.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test
npx ts-node tests/01-basic-agent.test.ts
npx ts-node tests/02-multi-agent.test.ts
npx ts-node tests/03-streaming.test.ts
npx ts-node tests/04-guardrails.test.ts
npx ts-node tests/05-sessions.test.ts
npx ts-node tests/06-langfuse-tracing.test.ts
npx ts-node tests/09-structured-output.test.ts
npx ts-node tests/10-error-handling.test.ts
npx ts-node tests/11-complete-integration.test.ts
npx ts-node tests/12-complex-scenarios.test.ts

# Run all tests
npx ts-node tests/run-all-tests.ts
```

## Test Coverage

1. **01-basic-agent.test.ts** - Basic agent functionality with tools
2. **02-multi-agent.test.ts** - Multi-agent handoffs and coordination
3. **03-streaming.test.ts** - Real-time streaming responses
4. **04-guardrails.test.ts** - Input/output validation and safety
5. **05-sessions.test.ts** - Session management (in-memory, Redis, MongoDB)
6. **06-langfuse-tracing.test.ts** - Langfuse integration and observability
7. **09-structured-output.test.ts** - Zod schema validation
8. **10-error-handling.test.ts** - Error handling and recovery
9. **11-complete-integration.test.ts** - End-to-end integration scenarios
10. **12-complex-scenarios.test.ts** - Real-world complex scenarios:
    - Multi-agent shopping workflow with context
    - Session-based conversation memory
    - Permission-based security with guardrails
    - Streaming with error recovery
    - Concurrent operations with resource management

## Environment Variables

Create a `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com

# Optional for specific tests
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
MISTRAL_API_KEY=...
```

## Test Results

All tests verify:
- ✅ Functionality works correctly
- ✅ Token usage is tracked
- ✅ Langfuse traces are created
- ✅ Errors are handled properly
- ✅ Metadata is complete
