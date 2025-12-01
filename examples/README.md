# 📚 Examples

Comprehensive examples demonstrating all features of the Tawk Agents SDK.

**Status**: ✅ **Aligned with src/** - See [EXAMPLES_ALIGNMENT_REPORT.md](../EXAMPLES_ALIGNMENT_REPORT.md)

---

## 🚀 Quick Start

Run any example with:

```bash
# Using tsx (recommended)
npx tsx examples/tool-call-tracing.ts

# Or using the run script
npm run example
```

---

## 📁 Current Examples (16 Files)

### Core Feature Examples

| Example | Features | Complexity |
|---------|----------|------------|
| **tool-call-tracing.ts** | Full tracing, parallel tools | ⭐⭐ |
| **dynamic-approvals.ts** | HITL approvals, policies | ⭐⭐ |
| **native-mcp.ts** | MCP integration | ⭐⭐ |
| **all-features.ts** | Quick reference | ⭐⭐⭐ |

### Advanced Examples

| Example | Features | Complexity |
|---------|----------|------------|
| **advanced/multi-agent-research.ts** | Complex coordination | ⭐⭐⭐ |
| **advanced/09-embeddings-rag.ts** | RAG with embeddings | ⭐⭐ |
| **advanced/10-vision.ts** | Vision capabilities | ⭐⭐ |
| **advanced/11-toon-format.ts** | TOON optimization | ⭐⭐ |

### Agentic Patterns

| Example | Features | Complexity |
|---------|----------|------------|
| **agentic-patterns/true-agentic-example.ts** | All patterns | ⭐⭐⭐ |

### Production Examples

| Example | Features | Complexity |
|---------|----------|------------|
| **production/complete-showcase.ts** | Enterprise features | ⭐⭐⭐ |
| **production/ecommerce-system.ts** | Real-world app | ⭐⭐⭐ |

### Utilities

- **run.ts** - Example runner
- **utils/** - Shared utilities (config, logger, errors)

---

## 🎯 Examples by Feature

### 🤖 Basic Agent Setup
- `all-features.ts` - Quick reference
- `production/complete-showcase.ts` - Full setup

### 🔧 Tool Calling
- `tool-call-tracing.ts` - Tool execution & tracing
- `agentic-patterns/true-agentic-example.ts` - Parallel tools

### 👥 Multi-Agent Systems
- `advanced/multi-agent-research.ts` - Complex coordination
- `agentic-patterns/true-agentic-example.ts` - Race agents

### ✅ Human-in-the-Loop (HITL)
- `dynamic-approvals.ts` - Dynamic policies ⭐
- `agentic-patterns/true-agentic-example.ts` - HITL patterns

### 🔌 MCP Integration
- `native-mcp.ts` - Native MCP ⭐

### 📊 Observability & Tracing
- `tool-call-tracing.ts` - Complete tracing ⭐
- `production/complete-showcase.ts` - Enterprise tracing

### 🛡️ Guardrails
- `production/complete-showcase.ts` - All guardrails

### 💬 Session Management
- `production/complete-showcase.ts` - Redis/MongoDB

### 🔄 Streaming
- `production/complete-showcase.ts` - Advanced streaming

### 🎒 TOON Format
- `advanced/11-toon-format.ts` - Token optimization

### 🖼️ Vision & Embeddings
- `advanced/09-embeddings-rag.ts` - RAG
- `advanced/10-vision.ts` - Vision

### 🏭 Production
- `production/complete-showcase.ts` - Enterprise
- `production/ecommerce-system.ts` - Real-world

---

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
# Feature-specific (start here)
npx tsx examples/tool-call-tracing.ts
npx tsx examples/native-mcp.ts
npx tsx examples/dynamic-approvals.ts

# Advanced
npx tsx examples/advanced/multi-agent-research.ts
npx tsx examples/advanced/09-embeddings-rag.ts

# Production
npx tsx examples/production/complete-showcase.ts
npx tsx examples/production/ecommerce-system.ts
```

---

## 📖 Recommended Learning Path

### 1. Start with Core Features (⭐)
```bash
npx tsx examples/tool-call-tracing.ts    # Tracing basics
npx tsx examples/native-mcp.ts           # MCP integration
npx tsx examples/dynamic-approvals.ts    # HITL approvals
```

### 2. Explore Advanced Patterns (⭐⭐)
```bash
npx tsx examples/advanced/11-toon-format.ts          # Optimization
npx tsx examples/advanced/09-embeddings-rag.ts       # RAG
npx tsx examples/agentic-patterns/true-agentic-example.ts  # Patterns
```

### 3. Production Systems (⭐⭐⭐)
```bash
npx tsx examples/production/complete-showcase.ts     # Enterprise
npx tsx examples/production/ecommerce-system.ts      # Real-world
```

---

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

Examples import from `../src`:

```typescript
import { Agent, run } from '../src';
// This is correct for examples
```

---

## 📝 Example Status

| Category | Count | Status |
|----------|-------|--------|
| Core Features | 4 | ✅ Updated |
| Advanced | 4 | ✅ Updated |
| Agentic Patterns | 1 | ✅ Updated |
| Production | 2 | ✅ Updated |
| Utilities | 5 | ✅ Updated |
| **Total** | **16** | ✅ **All Aligned** |

---

## 💬 Need Help?

- 📧 Email: support@tawk.to
- 🐛 Issues: [GitHub Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)
- 📖 Docs: [Full Documentation](../docs)

---

## 🤝 Contributing Examples

Have a great example? We'd love to include it! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

**Happy coding!** 🚀
