# Changelog

All notable changes to Tawk Agents SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-10

### 🎉 Initial Release

#### Added

**Core Features**
- ✅ Agent system with instructions, tools, and handoffs
- ✅ Multi-provider support (OpenAI, Anthropic, Google, Mistral)
- ✅ Tool system with automatic schema generation
- ✅ Session management (Memory, Redis, MongoDB, Hybrid)
- ✅ Context management for dependency injection
- ✅ Streaming support for real-time responses
- ✅ Structured output with Zod validation
- ✅ Agent cloning and agent-as-tool patterns

**Safety & Quality**
- ✅ 10+ built-in guardrails (content safety, PII, length, etc.)
- ✅ Custom guardrail support
- ✅ Input and output validation
- ✅ Comprehensive error types

**Advanced Features**
- ✅ Langfuse integration for automatic tracing
- ✅ MCP (Model Context Protocol) support
- ✅ Human-in-the-loop approval workflows
- ✅ Background result handling
- ✅ Multi-agent workflow support

**Developer Experience**
- ✅ Full TypeScript support with strict mode
- ✅ Comprehensive test suite (13/13 passing)
- ✅ Complete documentation
- ✅ ESLint and Prettier configuration
- ✅ Example code for common patterns

**Testing**
- ✅ Unit tests for all core features
- ✅ Integration tests with real API calls
- ✅ Multi-agent workflow tests
- ✅ Multi-provider testing (OpenAI + Google)
- ✅ Automatic Langfuse tracing in tests

**Documentation**
- ✅ Getting Started guide
- ✅ Core Concepts documentation
- ✅ Complete API reference
- ✅ Migration guide from other frameworks
- ✅ Quick reference guide
- ✅ Langfuse integration guide
- ✅ Testing guide
- ✅ Contributing guidelines

### Dependencies

- `ai`: ^4.0.0
- `zod`: ^3.22.0
- `langfuse`: ^3.38.6
- `@ai-sdk/openai`: ^1.0.0
- `@ai-sdk/anthropic`: ^1.0.0
- `@ai-sdk/google`: ^1.0.0
- `@ai-sdk/mistral`: ^1.0.0

### System Requirements

- Node.js ≥18.0.0
- TypeScript ≥5.0.0

---

## [Unreleased]

### Planned

- 🔄 OpenTelemetry support
- 🔄 Additional guardrail presets
- 🔄 More session storage adapters
- 🔄 Performance optimizations
- 🔄 CLI tools for testing and debugging

---

## Release Notes

### Version 1.0.0

This is the first stable release of Tawk Agents SDK, a production-ready framework for building AI agents. Built on top of the Vercel AI SDK with patterns inspired by the OpenAI Agents SDK.

**Highlights:**
- Complete feature parity with OpenAI Agents SDK (text-based features)
- Full Langfuse integration for observability
- Multi-agent workflow support
- 13/13 tests passing with real API calls
- Professional code quality and documentation

**Breaking Changes:**
- N/A (initial release)

**Migration:**
- See [MIGRATION.md](./MIGRATION.md) for migrating from other frameworks

**Credits:**
- Built on [Vercel AI SDK](https://sdk.vercel.ai/)
- Tracing by [Langfuse](https://langfuse.com/)
- Inspired by [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)

---

[1.0.0]: https://github.com/tawk/agents-sdk/releases/tag/v1.0.0
[Unreleased]: https://github.com/tawk/agents-sdk/compare/v1.0.0...HEAD
