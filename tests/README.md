# 🧪 Tawk Agents SDK - Test Suite

Comprehensive test suite organized to match the source code structure.

---

## 📁 Directory Structure

```
tests/
├── README.md                 # This file
├── STRUCTURE.md              # Structure documentation
│
├── unit/                     # Unit tests (mocked, fast)
│   ├── __mocks__/           # Mock implementations
│   ├── core/                # Core functionality tests
│   │   ├── agent.test.ts
│   │   ├── multi-agent.test.ts
│   │   ├── race-agents.test.ts
│   │   ├── streaming.test.ts
│   │   ├── tool-calling.test.ts
│   │   └── incremental.test.ts
│   ├── tools/                # Tools tests
│   │   └── content-creation.test.ts
│   ├── sessions/             # Session management tests
│   │   └── sessions.test.ts
│   ├── guardrails/           # Guardrails tests
│   │   └── guardrails.test.ts
│   ├── tracing/              # Tracing tests
│   │   └── tracing.test.ts
│   ├── handoffs/             # Handoff tests (ready)
│   ├── helpers/              # Helper tests (ready)
│   ├── lifecycle/            # Lifecycle tests (ready)
│   ├── approvals/            # Approval tests (ready)
│   ├── mcp/                  # MCP tests (ready)
│   └── types/                # Type tests (ready)
│
├── e2e/                      # End-to-end tests (real API)
│   ├── 01-basic-e2e.test.ts
│   ├── 02-multi-agent-e2e.test.ts
│   ├── 03-streaming-sessions-e2e.test.ts
│   └── README.md
│
├── integration/              # Integration tests (real API)
│   ├── run-all-tests.ts
│   └── README.md
│
└── utils/                    # Test utilities
    ├── helpers.ts           # Test helpers and mocks
    ├── setup.ts             # Jest setup
    └── index.ts             # Exports
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# For unit tests (no API keys needed)
npm test

# For E2E/integration tests (API keys required)
cp .env.example .env
# Edit .env with your API keys
```

### Running Tests

```bash
# Run all unit tests (fast, mocked)
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- unit/core/agent.test.ts
npm test -- unit/sessions/sessions.test.ts

# Run E2E tests (requires API keys)
npm run e2e

# Run integration tests (requires API keys)
npm run integration
```

---

## 📖 Test Categories

### Unit Tests (`unit/`)

**For:** Development and CI/CD

- **Speed**: <1 second for all tests
- **Requirements**: None (no API keys needed)
- **Responses**: Mocked
- **Results**: Deterministic
- **Cost**: Free

**Structure matches `src/` directory:**
- `unit/core/` - Tests for `src/core/`
- `unit/tools/` - Tests for `src/tools/`
- `unit/sessions/` - Tests for `src/sessions/`
- `unit/guardrails/` - Tests for `src/guardrails/`
- `unit/tracing/` - Tests for `src/tracing/`
- And more...

### E2E Tests (`e2e/`)

**For:** Validation and learning

- **Speed**: 3-5 seconds per test
- **Requirements**: API keys required
- **Responses**: Real API calls
- **Cost**: ~$0.005 for all tests

**Tests:**
- Basic agent functionality
- Multi-agent patterns
- Streaming and sessions

### Integration Tests (`integration/`)

**For:** Pre-release validation

- **Speed**: 30-60 seconds
- **Requirements**: API keys required
- **Responses**: Real API calls
- **Cost**: ~$0.05 for all tests

---

## 🧪 Unit Tests by Module

### Core (`unit/core/`)

**agent.test.ts** - Basic agent functionality
- Agent creation and configuration
- Basic execution
- Tool calling
- Context injection
- Token tracking
- Error handling

**multi-agent.test.ts** - Multi-agent systems
- Agent handoffs
- Multi-agent coordination
- Trace management

**race-agents.test.ts** - Parallel execution
- Race agents pattern
- Fastest response selection
- Fallback patterns

**streaming.test.ts** - Streaming responses
- Real-time streaming
- Stream events
- Progressive output

**tool-calling.test.ts** - Advanced tool calling
- Complex tool scenarios
- Tool chaining
- Error handling

**incremental.test.ts** - Incremental feature testing
- Feature-by-feature validation
- Breaking point identification

### Tools (`unit/tools/`)

**content-creation.test.ts** - AI tools
- Embeddings
- Image generation
- Audio (TTS/STT)
- Reranking

### Sessions (`unit/sessions/`)

**sessions.test.ts** - Session management
- In-memory sessions
- Session history
- Context persistence
- Multiple sessions

### Guardrails (`unit/guardrails/`)

**guardrails.test.ts** - Safety and validation
- Input guardrails
- Output guardrails
- Content safety
- PII detection
- Length limits

### Tracing (`unit/tracing/`)

**tracing.test.ts** - Observability
- Trace creation
- Token tracking
- Generation spans
- Handoff spans
- Metadata tracking

---

## 🛠️ Test Utilities

### Helpers (`utils/helpers.ts`)

```typescript
import { mockTextResponse, mockToolCallResponse } from '../utils/helpers';

// Mock text response
mockTextResponse('Output text', { prompt: 10, completion: 5 });

// Mock tool call response
mockToolCallResponse('Text', [
  { name: 'tool1', args: {}, result: {} }
]);
```

### Setup (`utils/setup.ts`)

Global Jest setup:
- Environment variable mocks
- Console suppression
- Langfuse mocks
- AI SDK mocks

---

## 📋 Test Standards

### File Naming

- Unit tests: `*.test.ts`
- E2E tests: `*-e2e.test.ts`
- Integration tests: `*.test.ts` (in integration/)

### Import Paths

```typescript
// SDK imports (from unit/ directory)
import { Agent, run } from '../../../src';

// Utility imports
import { mockTextResponse } from '../../utils/helpers';
```

### Test Structure

```typescript
import { Agent, run } from '../../../src';
import { mockTextResponse } from '../../utils/helpers';

describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should behave correctly', async () => {
    // Test implementation
  });
});
```

---

## 🎯 Test Coverage

### Current Coverage

- ✅ Core functionality (agent, run, streaming)
- ✅ Multi-agent systems
- ✅ Tool calling
- ✅ Sessions
- ✅ Guardrails
- ✅ Tracing
- ✅ Tools (embeddings, images, audio)

### Missing Coverage

- ⚠️ Handoffs (tests needed)
- ⚠️ MCP integration (tests needed)
- ⚠️ Approvals (tests needed)
- ⚠️ Helpers (tests needed)
- ⚠️ Lifecycle (tests needed)

---

## 🔧 Configuration

### Jest Configuration

Tests use Jest with TypeScript support. Configuration in `jest.config.js` or `package.json`.

### Environment Variables

For E2E and integration tests:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
```

---

## 📊 Test Comparison

| Type | Speed | Cost | Network | API Keys | Purpose |
|------|-------|------|---------|----------|---------|
| **Unit** | ⚡ <1s | Free | ❌ No | ❌ No | Development & CI/CD |
| **E2E** | 🏃 3-5s | ~$0.005 | ✅ Yes | ✅ Yes | Validation & demos |
| **Integration** | 🐌 30-60s | ~$0.05 | ✅ Yes | ✅ Yes | Pre-release validation |

---

## 💡 Best Practices

1. **Match Source Structure** - Tests mirror `src/` directory
2. **Use Utilities** - Import from `utils/`
3. **Mock External APIs** - Unit tests should be fast
4. **Test Real APIs** - Use E2E/integration for validation
5. **Keep Tests Focused** - One feature per test file
6. **Update Tests** - Keep tests in sync with code

---

## 🐛 Troubleshooting

### Common Issues

**"Module not found"**
- Check import paths: `from '../../../src'`
- Verify file structure matches `src/`

**"Mock not working"**
- Check `utils/setup.ts` is loaded
- Verify Jest configuration

**"API key missing"**
- E2E/integration tests require API keys
- Use `.env` file for configuration

---

## 📚 Related Resources

- **[Examples](../examples/)** - Code examples
- **[Documentation](../docs/)** - Complete documentation
- **[Source Code](../src/)** - Source code structure

---

## 🤝 Contributing

### Adding Tests

1. **Choose Location** - Match `src/` structure
2. **Use Utilities** - Import from `utils/`
3. **Follow Naming** - Use `*.test.ts` convention
4. **Update README** - Document new tests

### Test Template

```typescript
import { Agent, run } from '../../../src';
import { mockTextResponse } from '../../utils/helpers';

describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should work correctly', async () => {
    // Test implementation
  });
});
```

---

## 📝 License

MIT © [Tawk.to](https://www.tawk.to)

---

**Ready to test? Start with `npm test`!** 🧪
