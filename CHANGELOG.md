# Changelog

All notable changes to the Tawk Agents SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-01

### 🎉 Initial Production Release

The first production-ready release of Tawk Agents SDK with true agentic architecture.

### ✨ Added

#### Core Features
- **True Agentic Architecture**: Agent-driven autonomous decision making
  - Proper state management with `RunState` abstraction
  - Autonomous decision making via `determineNextStep`
  - Parallel tool execution engine
  - Support for interruption and resumption

- **Multi-Agent Orchestration**: Seamless agent handoffs
  - Autonomous handoff decisions
  - Handoff chain tracking
  - Agent coordination patterns
  - `raceAgents` for parallel agent execution

- **Tool Calling**: Native function tools
  - Automatic parallel tool execution
  - Context injection in all tools
  - Type-safe tool definitions with Zod
  - Tool enabling based on context
  - Dynamic tool configuration

#### Advanced Features
- **Dynamic HITL Approvals**: Context-aware human-in-the-loop
  - `ApprovalManager` for approval workflows
  - `toolWithApproval` helper function
  - Approval policies: CLI, webhook, auto-approve, auto-reject
  - Dynamic `needsApproval` function based on context
  - Approval metadata (severity, category, required role)

- **Native MCP Integration**: Model Context Protocol support
  - `EnhancedMCPServerManager` for server lifecycle
  - Agent-level MCP configuration via `mcpServers`
  - Auto-discovery of tools from MCP servers
  - Support for stdio and SSE transports
  - Tool execution through MCP servers

- **Full Observability**: Complete Langfuse tracing
  - Automatic trace creation for agent runs
  - Tool call tracing with inputs/outputs/durations
  - Agent span tracing with nesting
  - Handoff tracing
  - Guardrail tracing
  - Token usage tracking
  - Cost calculation
  - Error tracking with ERROR level

#### Session Management
- **MemorySession**: In-memory session storage
- **RedisSession**: Redis-backed sessions with TTL
- **DatabaseSession**: MongoDB-backed sessions
- **HybridSession**: Redis + MongoDB with automatic syncing
- **SessionManager**: Centralized session management

#### Guardrails
- `contentSafetyGuardrail`: AI-powered content moderation
- `piiDetectionGuardrail`: PII detection and blocking
- `lengthGuardrail`: Length validation (characters/words/tokens)
- `topicRelevanceGuardrail`: Topic relevance checking
- `formatValidationGuardrail`: Format validation (JSON/XML/YAML/Markdown)
- `rateLimitGuardrail`: Rate limiting per user/session
- `languageGuardrail`: Language detection and filtering
- `sentimentGuardrail`: Sentiment analysis
- `toxicityGuardrail`: Toxicity detection
- `customGuardrail`: Custom validation logic

#### AI Features
- **Embeddings**: `createEmbeddingTool` for semantic search
- **Image Generation**: `createImageGenerationTool` for DALL-E, Stable Diffusion
- **Audio Transcription**: `createTranscriptionTool` for Whisper
- **Text-to-Speech**: `createTextToSpeechTool` for TTS
- **Reranking**: `createRerankTool` for Cohere reranking

#### Performance Optimizations
- **TOON Format**: 42% token reduction vs JSON
  - `encodeTOON` / `decodeTOON`
  - `formatToolResultTOON`
  - `formatToolResultsBatch`
  - `calculateTokenSavings`

- **Parallel Execution**: Automatic parallelization
  - Parallel tool execution in `executeToolsInParallel`
  - Race agents for fastest response
  - Smart caching for repeated calls

- **Memory Efficiency**:
  - Reusable objects to reduce allocations
  - Incremental metadata tracking
  - Message formatting cache for Langfuse
  - Context wrapper caching

#### Streaming
- `runStream`: Real-time response streaming
- Granular events: `text-delta`, `tool-call`, `tool-result`, `handoff`, `finish`, `error`
- `textStream`: Simple text chunks
- `fullStream`: Complete event stream

#### Developer Experience
- **TypeScript First**: Complete type safety
- **Generic Context**: Type-safe context injection
- **Structured Outputs**: Zod schema validation
- **Error Handling**: Comprehensive error types
- **Lifecycle Hooks**: `onStart`, `onError`, `onComplete`
- **Provider Agnostic**: OpenAI, Anthropic, Google, Groq, Mistral

### 📚 Documentation
- Comprehensive README with examples
- API reference documentation
- Getting started guide
- Core concepts guide
- Features guide
- Agentic RAG guide
- Performance guide
- Architecture documentation
- Testing guide
- Examples directory with 15+ examples

### 🧪 Testing
- Unit tests for core functionality
- Integration tests for multi-agent systems
- E2E tests for real-world scenarios
- Manual tests for approval flows and MCP
- Test coverage: 85%+

### 🔧 Development
- TypeScript 5.7 support
- ESLint configuration
- Jest test framework
- Build scripts for distribution
- Docker Compose for local Redis/MongoDB

---

## [Unreleased]

### Planned Features
- [ ] Enhanced streaming with more granular events
- [ ] Built-in vector database integrations
- [ ] Web UI for approval management
- [ ] Agent marketplace
- [ ] Custom model provider support
- [ ] Agent composition patterns
- [ ] Distributed agent execution
- [ ] Agent versioning and rollback

---

## Migration Guide

### Migrating to 1.0.0

This is the first stable release. If you were using a pre-release version:

#### Breaking Changes
- None (first release)

#### New Features
All features listed above are new in 1.0.0.

#### Deprecations
- None

---

## Links

- [GitHub Repository](https://github.com/Manoj-tawk/tawk-agents-sdk)
- [npm Package](https://www.npmjs.com/package/tawk-agents-sdk)
- [Documentation](./docs)
- [Examples](./examples)
- [Issues](https://github.com/Manoj-tawk/tawk-agents-sdk/issues)

---

**Note**: This project follows [Semantic Versioning](https://semver.org/). For more details about the release process, see [CONTRIBUTING.md](./CONTRIBUTING.md).
