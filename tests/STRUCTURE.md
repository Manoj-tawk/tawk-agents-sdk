# Test Suite Structure

This document describes the production-standard organization of the test suite, matching the source code structure.

## Directory Layout

```
tests/
├── README.md                 # Main test documentation
├── STRUCTURE.md              # This file
│
├── unit/                     # Unit tests (mocked, fast)
│   ├── __mocks__/           # Mock implementations
│   ├── core/                # Tests for src/core/
│   ├── tools/                # Tests for src/tools/
│   ├── sessions/             # Tests for src/sessions/
│   ├── guardrails/           # Tests for src/guardrails/
│   ├── tracing/              # Tests for src/tracing/
│   ├── handoffs/             # Tests for src/handoffs/
│   ├── helpers/              # Tests for src/helpers/
│   ├── lifecycle/            # Tests for src/lifecycle/
│   ├── approvals/            # Tests for src/approvals/
│   ├── mcp/                  # Tests for src/mcp/
│   └── types/                # Tests for src/types/
│
├── e2e/                      # End-to-end tests
│   └── *.test.ts
│
├── integration/              # Integration tests
│   └── *.test.ts
│
└── utils/                    # Test utilities
    ├── helpers.ts           # Test helpers
    ├── setup.ts             # Jest setup
    └── index.ts             # Exports
```

## Structure Principles

### 1. Match Source Structure

Tests are organized to mirror `src/` directory:

```
src/core/agent.ts          → tests/unit/core/agent.test.ts
src/tools/embeddings/      → tests/unit/tools/embeddings.test.ts
src/sessions/session.ts    → tests/unit/sessions/sessions.test.ts
```

### 2. Test Categories

- **Unit Tests** (`unit/`) - Fast, mocked, no API keys
- **E2E Tests** (`e2e/`) - Real API, quick validation
- **Integration Tests** (`integration/`) - Real API, comprehensive

### 3. File Naming

- Unit tests: `*.test.ts`
- E2E tests: `*-e2e.test.ts`
- Integration tests: `*.test.ts` (in integration/)

## Import Paths

### From Unit Tests

```typescript
// SDK imports (3 levels up from unit/)
import { Agent, run } from '../../../src';

// Utility imports (2 levels up)
import { mockTextResponse } from '../../utils/helpers';
```

### From E2E Tests

```typescript
// SDK imports (2 levels up)
import { Agent, run } from '../../src';

// Utility imports (1 level up)
import { helpers } from '../utils';
```

### From Integration Tests

```typescript
// SDK imports (2 levels up)
import { Agent, run } from '../../src';
```

## Test Utilities

### Helpers (`utils/helpers.ts`)

- `mockTextResponse()` - Mock text responses
- `mockToolCallResponse()` - Mock tool calls
- `createMockModel()` - Create mock models
- `createMockStream()` - Create mock streams

### Setup (`utils/setup.ts`)

- Environment variable mocks
- Console suppression
- Langfuse mocks
- AI SDK mocks

## Best Practices

1. **Match Structure** - Tests mirror `src/` organization
2. **Use Utilities** - Import from `utils/`
3. **Mock External** - Unit tests should be fast
4. **Test Real APIs** - E2E/integration for validation
5. **Keep Focused** - One feature per test file
6. **Update Together** - Keep tests in sync with code

