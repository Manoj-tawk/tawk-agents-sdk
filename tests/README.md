# Tawk Agents SDK - Comprehensive Test Suite

This test suite covers all features and scenarios of the Tawk Agents SDK with real API calls.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:basic         # Basic functionality
npm run test:storage       # Session storage tests

# Run individual tests
npx ts-node tests/01-basic-agent.test.ts
npx ts-node tests/14-multi-model-handoff.test.ts
npx ts-node tests/16-auto-summarization.test.ts
npx ts-node tests/17-session-storage-e2e.test.ts
```

## Test Coverage

### Core Functionality
1. **01-basic-agent.test.ts** - Basic agent functionality with tools
2. **02-multi-agent.test.ts** - Multi-agent handoffs and coordination
3. **03-streaming.test.ts** - Real-time streaming responses
4. **04-guardrails.test.ts** - Input/output validation and safety
5. **05-sessions.test.ts** - Session management basics
6. **06-langfuse-tracing.test.ts** - Langfuse integration and observability
7. **09-structured-output.test.ts** - Zod schema validation
8. **10-error-handling.test.ts** - Error handling and recovery
9. **11-complete-integration.test.ts** - End-to-end integration scenarios

### Advanced Features
10. **12-complex-scenarios.test.ts** - Real-world complex scenarios:
    - Multi-agent shopping workflow with context
    - Session-based conversation memory
    - Permission-based security with guardrails
    - Streaming with error recovery
    - Concurrent operations with resource management

11. **13-multi-turn-multi-model.test.ts** - Multi-turn conversations:
    - Testing with Claude, OpenAI models
    - Long conversation handling
    - Context preservation across turns

12. **14-multi-model-handoff.test.ts** - Multi-model agent system:
    - OpenAI, Anthropic, Google, Groq models
    - 40-turn conversation test
    - Multi-agent handoffs with different models
    - Auto-summarization in production

13. **16-auto-summarization.test.ts** - Auto-summarization feature:
    - Simple fallback (no LLM)
    - LLM-powered summarization
    - Custom configuration testing
    - Token optimization verification

14. **17-session-storage-e2e.test.ts** - Comprehensive storage testing:
    - Memory (in-memory) session
    - Redis session with persistence
    - MongoDB session with database
    - Hybrid (Redis + MongoDB) session
    - Auto-summarization with all storage types
    - Session persistence and retrieval
    - Context preservation across sessions

## Environment Variables

Create a `.env` file with your API keys:

```bash
# Required for basic tests
OPENAI_API_KEY=sk-...

# Required for tracing tests
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com

# Required for multi-model tests
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=gsk_...

# Optional for session storage tests
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URL=mongodb://localhost:27017
```

## Running Storage Tests with Docker

For tests requiring Redis and MongoDB:

```bash
# Start services
docker-compose up -d

# Run storage tests
npm run test:storage

# Stop services
docker-compose down
```

## Test Results

All tests verify:
- ✅ Functionality works correctly
- ✅ Token usage is tracked
- ✅ Langfuse traces are created (when enabled)
- ✅ Errors are handled properly
- ✅ Context preservation across sessions
- ✅ Auto-summarization triggers correctly
- ✅ Storage persistence (Memory, Redis, MongoDB, Hybrid)

## Test Statistics

- **Total Tests**: 17 comprehensive test suites
- **Storage Types Tested**: 4 (Memory, Redis, MongoDB, Hybrid)
- **Models Tested**: 4 (OpenAI, Anthropic, Google, Groq)
- **Max Conversation Length**: 40+ turns with auto-summarization
- **Coverage**: All core features + advanced capabilities
