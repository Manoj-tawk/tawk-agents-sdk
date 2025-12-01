# 📚 Examples

This directory contains comprehensive examples demonstrating all features of the Tawk Agents SDK.

## 🚀 Quick Start

Run any example with:

```bash
# Using tsx
npx tsx examples/basic/01-simple-agent.ts

# Or using the run script
npm run example
```

## 📁 Directory Structure

### `/basic` - Getting Started

Simple examples for beginners:

- `01-simple-agent.ts` - Basic agent setup
- `02-agent-with-tools.ts` - Adding tools to agents
- `03-streaming.ts` - Streaming responses
- `04-context-injection.ts` - Using context in tools
- `05-multi-turn.ts` - Multi-turn conversations with sessions

### `/intermediate` - Common Patterns

Intermediate examples for common use cases:

- `06-multi-agent-handoffs.ts` - Agent handoffs and coordination
- `07-guardrails.ts` - Input/output validation
- `08-langfuse-tracing.ts` - Observability with Langfuse

### `/advanced` - Advanced Features

Advanced examples for power users:

- `09-embeddings-rag.ts` - RAG with embeddings
- `10-vision.ts` - Vision capabilities
- `11-toon-format.ts` - TOON format optimization
- `multi-agent-research.ts` - Complex multi-agent system

### `/agentic-patterns` - True Agentic Architecture

Examples demonstrating true agentic behavior:

- `true-agentic-example.ts` - Comprehensive agentic patterns
  - Parallel tool execution
  - Autonomous decision making
  - Agent coordination
  - HITL patterns

### `/production` - Production-Ready Examples

Production-grade examples:

- `complete-showcase.ts` - All features integrated
- `ecommerce-system.ts` - Real-world e-commerce system

### Root Level Examples

Specialized feature examples:

- `all-features.ts` - Quick reference for all features
- `native-mcp.ts` - Model Context Protocol integration
- `dynamic-approvals.ts` - Human-in-the-loop approvals
- `tool-call-tracing.ts` - Complete tracing demonstration

### `/utils` - Shared Utilities

Reusable utilities for examples:

- `config.ts` - Configuration management
- `logger.ts` - Logging utilities
- `errors.ts` - Error handling
- `index.ts` - Centralized exports

## 🎯 Examples by Feature

### 🤖 Basic Agent Setup
- `basic/01-simple-agent.ts`

### 🔧 Tool Calling
- `basic/02-agent-with-tools.ts` - Basic tools
- `agentic-patterns/true-agentic-example.ts` - Parallel tool execution

### 👥 Multi-Agent Systems
- `intermediate/06-multi-agent-handoffs.ts` - Basic handoffs
- `advanced/multi-agent-research.ts` - Complex coordination
- `agentic-patterns/true-agentic-example.ts` - Race agents & coordination

### ✅ Human-in-the-Loop (HITL)
- `dynamic-approvals.ts` - Dynamic approval policies
- `agentic-patterns/true-agentic-example.ts` - HITL patterns

### 🔌 MCP Integration
- `native-mcp.ts` - Native Model Context Protocol

### 📊 Observability & Tracing
- `intermediate/08-langfuse-tracing.ts` - Langfuse setup
- `tool-call-tracing.ts` - Complete tracing demo

### 🛡️ Guardrails
- `intermediate/07-guardrails.ts` - All guardrail types

### 💬 Session Management
- `basic/05-multi-turn.ts` - Memory sessions
- `production/complete-showcase.ts` - Redis/MongoDB sessions

### 🔄 Streaming
- `basic/03-streaming.ts` - Basic streaming
- `production/complete-showcase.ts` - Advanced streaming

### 🎒 TOON Format
- `advanced/11-toon-format.ts` - Token optimization

### 🖼️ Vision & Embeddings
- `advanced/09-embeddings-rag.ts` - RAG with embeddings
- `advanced/10-vision.ts` - Vision capabilities

### 🏭 Production Examples
- `production/complete-showcase.ts` - Enterprise features
- `production/ecommerce-system.ts` - Real-world application

## 💡 Running Examples

### Prerequisites

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Required Environment Variables

```bash
# At minimum, you need one AI provider:
OPENAI_API_KEY=sk-...

# Optional (for specific examples):
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...

# For tracing examples:
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# For session examples:
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017
```

### Run Examples

```bash
# Basic examples
npx tsx examples/basic/01-simple-agent.ts
npx tsx examples/basic/02-agent-with-tools.ts

# Intermediate examples
npx tsx examples/intermediate/06-multi-agent-handoffs.ts

# Advanced examples
npx tsx examples/advanced/multi-agent-research.ts

# Feature-specific examples
npx tsx examples/native-mcp.ts
npx tsx examples/dynamic-approvals.ts
npx tsx examples/tool-call-tracing.ts

# Production examples
npx tsx examples/production/complete-showcase.ts
```

## 📖 Learning Path

### Beginner (Start Here)

1. `basic/01-simple-agent.ts` - Understand basic agent setup
2. `basic/02-agent-with-tools.ts` - Learn tool calling
3. `basic/03-streaming.ts` - Real-time responses
4. `basic/04-context-injection.ts` - Dependency injection
5. `basic/05-multi-turn.ts` - Conversation management

### Intermediate

6. `intermediate/06-multi-agent-handoffs.ts` - Agent coordination
7. `intermediate/07-guardrails.ts` - Safety & validation
8. `intermediate/08-langfuse-tracing.ts` - Observability

### Advanced

9. `advanced/09-embeddings-rag.ts` - RAG systems
10. `advanced/11-toon-format.ts` - Performance optimization
11. `advanced/multi-agent-research.ts` - Complex systems

### Production

12. `agentic-patterns/true-agentic-example.ts` - Agentic architecture
13. `production/complete-showcase.ts` - All features
14. `production/ecommerce-system.ts` - Real-world app

## 🆘 Troubleshooting

### "Module not found" errors

Make sure you've built the SDK:

```bash
npm run build
```

### API key errors

Check your `.env` file has the required keys:

```bash
cat .env | grep API_KEY
```

### TypeScript errors

Ensure you're using Node 18+ and TypeScript 5.7+:

```bash
node --version  # Should be >= 18
npx tsc --version  # Should be >= 5.7
```

### Import errors

Use `dist/index` for imports:

```typescript
import { Agent, run } from '../dist/index';
// NOT: import { Agent, run } from '../src/index';
```

## 💬 Need Help?

- 📧 Email: support@tawk.to
- 🐛 Issues: [GitHub Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)
- 📖 Docs: [Full Documentation](../docs)

## 🤝 Contributing Examples

Have a great example? We'd love to include it! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

**Happy coding!** 🚀
