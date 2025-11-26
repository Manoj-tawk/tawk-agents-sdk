# 📚 Tawk Agents SDK - Documentation

Complete documentation for the Tawk Agents SDK - a production-ready AI agent framework.

---

## 📁 Directory Structure

```
docs/
├── README.md                 # This file
│
├── getting-started/          # Beginner guides
│   └── GETTING_STARTED.md   # Installation and first steps
│
├── guides/                   # Intermediate guides
│   ├── CORE_CONCEPTS.md     # Core concepts and patterns
│   ├── FEATURES.md          # Feature guide
│   └── AGENTIC_RAG.md       # Agentic RAG implementation guide
│
├── reference/                # Reference documentation
│   ├── API.md               # Complete API reference
│   ├── ARCHITECTURE.md      # System architecture
│   └── PERFORMANCE.md       # Performance optimization
│
└── utils/                    # Documentation utilities (if needed)
```

---

## 🚀 Quick Navigation

### For Beginners

1. **[Getting Started](./getting-started/GETTING_STARTED.md)** - Start here!
   - Installation
   - Your first agent
   - Basic concepts

2. **[Core Concepts](./guides/CORE_CONCEPTS.md)** - Understand the fundamentals
   - Agents and tools
   - Sessions and memory
   - Guardrails and safety

### For Developers

3. **[Features Guide](./guides/FEATURES.md)** - Explore all features
   - Multi-agent systems
   - Tool calling
   - Streaming
   - Advanced patterns

4. **[Agentic RAG Guide](./guides/AGENTIC_RAG.md)** - Build production RAG systems
   - Pure agent orchestration
   - Multi-agent RAG workflow
   - Semantic search with embeddings
   - Context synthesis

5. **[API Reference](./reference/API.md)** - Complete API documentation
   - All functions and classes
   - Type definitions
   - Usage examples

### For Advanced Users

6. **[Architecture](./reference/ARCHITECTURE.md)** - System design
   - Internal architecture
   - Data flow
   - Extension points

7. **[Performance](./reference/PERFORMANCE.md)** - Optimization
   - Best practices
   - Performance tips
   - Cost optimization

---

## 📖 Documentation Guide

### Learning Path

**New to the SDK?**
```
Getting Started → Core Concepts → Features Guide → API Reference
```

**Building an application?**
```
Features Guide → API Reference → Performance
```

**Contributing or extending?**
```
Architecture → API Reference → Performance
```

---

## 📚 Documentation Categories

### Getting Started (`getting-started/`)

**For:** First-time users

- Installation and setup
- Your first agent
- Basic examples
- Environment configuration

**Start here:** [GETTING_STARTED.md](./getting-started/GETTING_STARTED.md)

### Guides (`guides/`)

**For:** Developers building applications

- Core concepts and patterns
- Feature explanations
- Best practices
- Common use cases

**Files:**
- [CORE_CONCEPTS.md](./guides/CORE_CONCEPTS.md) - Understanding the SDK
- [FEATURES.md](./guides/FEATURES.md) - All features explained
- [AGENTIC_RAG.md](./guides/AGENTIC_RAG.md) - Agentic RAG implementation guide
- [TOON_OPTIMIZATION.md](./guides/TOON_OPTIMIZATION.md) - TOON token optimization guide

### Reference (`reference/`)

**For:** Advanced users and contributors

- Complete API documentation
- System architecture
- Performance optimization
- Internal details

**Files:**
- [API.md](./reference/API.md) - Complete API reference
- [ARCHITECTURE.md](./reference/ARCHITECTURE.md) - System design
- [PERFORMANCE.md](./reference/PERFORMANCE.md) - Optimization guide

---

## 🎯 What is Tawk Agents SDK?

Tawk Agents SDK is a production-ready framework for building AI agents with:

- 🤖 **Multi-Agent Orchestration** - Coordinate specialized agents
- 🔧 **Tool Calling** - Native function tools with context injection
- 🛡️ **Guardrails** - Built-in validation and safety checks
- 📊 **Observability** - Langfuse tracing and monitoring
- 💬 **Session Management** - Multiple storage backends
- 🔄 **Streaming** - Real-time response streaming
- 🚀 **Multi-Provider** - OpenAI, Anthropic, Google, Groq, and more
- 📦 **TypeScript First** - Complete type safety
- ⚡ **Performance** - Optimized for production

---

## 🔍 Finding Information

### By Topic

**Agents**
- [Getting Started](./getting-started/GETTING_STARTED.md#creating-your-first-agent)
- [Core Concepts](./guides/CORE_CONCEPTS.md#agents)
- [API Reference](./reference/API.md#agent-class)

**Tools**
- [Core Concepts](./guides/CORE_CONCEPTS.md#tools)
- [Features](./guides/FEATURES.md#tool-calling)
- [API Reference](./reference/API.md#tool-function)

**Sessions**
- [Core Concepts](./guides/CORE_CONCEPTS.md#sessions)
- [Features](./guides/FEATURES.md#session-management)
- [API Reference](./reference/API.md#session-management)

**Guardrails**
- [Core Concepts](./guides/CORE_CONCEPTS.md#guardrails)
- [Features](./guides/FEATURES.md#guardrails)
- [API Reference](./reference/API.md#guardrails)

**Multi-Agent**
- [Features](./guides/FEATURES.md#multi-agent-systems)
- [API Reference](./reference/API.md#multi-agent-handoffs)

**Performance**
- [Performance Guide](./reference/PERFORMANCE.md)
- [Architecture](./reference/ARCHITECTURE.md#performance)

### By Use Case

**Building a chatbot**
- [Getting Started](./getting-started/GETTING_STARTED.md)
- [Sessions](./guides/CORE_CONCEPTS.md#sessions)
- [Streaming](./guides/FEATURES.md#streaming)

**Building a RAG system**
- [Agentic RAG Guide](./guides/AGENTIC_RAG.md) - Complete implementation guide
- [TOON Optimization](./guides/TOON_OPTIMIZATION.md) - 18-33% token reduction
- [Embeddings](./guides/FEATURES.md#embeddings)
- [RAG Patterns](./reference/ARCHITECTURE.md#rag-patterns)

**Building a multi-agent system**
- [Multi-Agent](./guides/FEATURES.md#multi-agent-systems)
- [Architecture](./reference/ARCHITECTURE.md#multi-agent-orchestration)

**Optimizing performance**
- [Performance Guide](./reference/PERFORMANCE.md)
- [TOON Optimization](./guides/TOON_OPTIMIZATION.md) - 18-33% token reduction
- [Best Practices](./reference/PERFORMANCE.md#best-practices)

---

## 📋 Documentation Standards

### Structure

All documentation follows these standards:

1. **Clear Headers** - Hierarchical structure
2. **Code Examples** - Runnable examples
3. **Type Safety** - TypeScript examples
4. **Cross-References** - Links to related docs
5. **Best Practices** - Production-ready patterns

### Examples

All code examples:
- Use TypeScript
- Include imports
- Are runnable
- Follow best practices
- Include error handling

---

## 🔗 Related Resources

- **[Examples](../examples/)** - Code examples and tutorials
- **[Tests](../tests/)** - Test suite and examples
- **[Main README](../README.md)** - Project overview
- **[GitHub](https://github.com/Manoj-tawk/tawk-agents-sdk)** - Source code

---

## 🤝 Contributing

### Adding Documentation

1. **Choose Category** - Place in appropriate directory
2. **Follow Structure** - Use existing docs as templates
3. **Add Examples** - Include runnable code
4. **Cross-Reference** - Link to related docs
5. **Update README** - Add to navigation

### Documentation Template

```markdown
# Title

Brief description.

## Overview

What this covers.

## Examples

```typescript
// Code example
```

## Related

- [Link to related doc](./path/to/doc.md)
```

---

## 📞 Need Help?

- 📧 **Email**: support@tawk.to
- 🐛 **Issues**: [GitHub Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)
- 📖 **Examples**: [Examples Directory](../examples/)
- 🧪 **Tests**: [Test Suite](../tests/)

---

## 📝 License

MIT © [Tawk.to](https://www.tawk.to)

---

**Ready to build amazing AI applications? Start with [Getting Started](./getting-started/GETTING_STARTED.md)!** 🚀
