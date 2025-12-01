# Manual Tests

Manual tests for interactive validation, external service integration, and detailed verification.

## 📋 Test Files

### 🔄 Parallel Execution
- **`test-parallel-tools.ts`** - Validates parallel tool execution
- **`test-true-parallel.ts`** - Millisecond-level parallel validation with timestamps

### 🤝 Multi-Agent Coordination
- **`test-multi-agent.ts`** - Tests multi-agent handoffs and coordination patterns

### 🛡️ Human-in-the-Loop
- **`test-dynamic-approvals.ts`** - Dynamic HITL approval policies (requires user interaction)

### 🔌 External Integration
- **`test-native-mcp.ts`** - MCP server integration (requires MCP server running)

## 🚀 How to Run

```bash
# Test parallel tool execution
npx tsx tests/manual/test-parallel-tools.ts
npx tsx tests/manual/test-true-parallel.ts

# Test multi-agent coordination
npx tsx tests/manual/test-multi-agent.ts

# Test dynamic approvals (requires user interaction)
npx tsx tests/manual/test-dynamic-approvals.ts

# Test MCP integration (requires MCP server)
npx tsx tests/manual/test-native-mcp.ts
```

## 📊 Purpose

Manual tests are **NOT** part of automated CI/CD. They are for:

1. **Interactive Testing** - HITL approvals requiring user input
2. **External Services** - MCP servers, external APIs
3. **Detailed Validation** - Parallel execution with timestamps
4. **Visual Verification** - Console output inspection
5. **Development Debugging** - Feature development validation

## ⚙️ Requirements

- Node.js 18+
- Environment variables (`.env`):
  - `OPENAI_API_KEY` - Required for all tests
  - `LANGFUSE_*` - Optional for tracing
- External services:
  - **MCP Server** - Only for `test-native-mcp.ts`
  - **User Interaction** - Only for `test-dynamic-approvals.ts`

## 💡 What They Validate

### Core Agentic Features
- ✅ Parallel tool execution (Promise.all)
- ✅ Multi-agent handoffs (linear, nested)
- ✅ Agent coordination patterns
- ✅ Dynamic HITL approvals

### Advanced Features
- ✅ MCP server integration
- ✅ Context-aware approval policies
- ✅ Nested agent execution
- ✅ Parallel agent coordination

## 📝 Notes

- These tests make **real API calls** to OpenAI
- They are **not deterministic** (LLM responses vary)
- They are **not suitable for CI/CD**
- They are **great for development validation**

