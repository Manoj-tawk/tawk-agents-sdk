# 📚 Tawk Agents SDK - Examples

Production-ready examples demonstrating all features of the Tawk Agents SDK.

---

## 📁 Directory Structure

```
examples/
├── README.md                 # This file
├── STRUCTURE.md              # Structure documentation
├── run.ts                    # Example runner script
├── all-features.ts           # Comprehensive reference (all 15 examples)
│
├── basic/                    # Beginner-friendly examples (coming soon)
├── intermediate/             # Intermediate examples (coming soon)
│
├── advanced/                 # Advanced examples
│   ├── 09-embeddings-rag.ts # Embeddings & RAG system
│   ├── 10-vision.ts         # Vision and image analysis
│   └── 11-toon-format.ts    # TOON format for efficiency
│
├── production/              # Production-ready examples
│   ├── ecommerce-system.ts  # Complete e-commerce system
│   └── complete-showcase.ts # Complete feature showcase
│
└── utils/                   # Shared utilities
    ├── config.ts           # Configuration management
    ├── errors.ts           # Error handling
    ├── logger.ts           # Logging utilities
    └── index.ts            # Exports
```

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Run Examples

```bash
# Run all examples
npx tsx examples/run.ts

# Run specific category
npx tsx examples/run.ts --category advanced
npx tsx examples/run.ts --category production

# Run specific example
npx tsx examples/run.ts --example 09-embeddings-rag
npx tsx examples/run.ts --example ecommerce-system

# Run with verbose logging
npx tsx examples/run.ts --verbose
```

### 3. Run Individual Examples

```bash
# Advanced examples
npx tsx examples/advanced/09-embeddings-rag.ts
npx tsx examples/advanced/10-vision.ts
npx tsx examples/advanced/11-toon-format.ts

# Production examples
npx tsx examples/production/ecommerce-system.ts
npx tsx examples/production/complete-showcase.ts

# Comprehensive reference
npx tsx examples/all-features.ts
npx tsx examples/all-features.ts "basic-agent"
```

---

## 📖 Available Examples

### 🎯 Comprehensive Reference

**`all-features.ts`** - Complete reference with 15 examples covering all features:
- Basic Agent
- Agent with Tools
- Context Injection
- Multi-Agent Handoffs
- Streaming
- Session Management
- Guardrails
- Structured Output
- Embeddings
- Image Generation
- Reranking
- Race Agents
- TOON Format
- Dynamic Instructions
- Dynamic Tool Enabling

**Usage:**
```bash
# Run all examples
npx tsx examples/all-features.ts

# Run specific example
npx tsx examples/all-features.ts "basic-agent"
npx tsx examples/all-features.ts "multi-agent-handoffs"
```

### 🔴 Advanced Examples

#### 09-embeddings-rag.ts
**Embeddings & RAG System**
- Generate embeddings for documents
- Semantic similarity search
- Complete RAG system
- Embedding tools for agents

**Run:**
```bash
npx tsx examples/advanced/09-embeddings-rag.ts
```

#### 10-vision.ts
**Vision and Image Analysis**
- Image analysis with GPT-4o
- Multimodal understanding
- Structured data extraction from images

**Run:**
```bash
npx tsx examples/advanced/10-vision.ts
```

**Note:** Requires actual image URLs to test vision features.

#### 11-toon-format.ts
**TOON Format for Efficiency**
- TOON encoding/decoding
- Token savings comparison (40%+ reduction)
- Real-world use cases
- Database query results

**Run:**
```bash
npx tsx examples/advanced/11-toon-format.ts
```

### 🏭 Production Examples

#### ecommerce-system.ts
**Complete E-commerce System**
- Multi-agent orchestration
- Session management (Redis, MongoDB, Hybrid)
- Agent as tool pattern
- Complete shopping workflow

**Run:**
```bash
npx tsx examples/production/ecommerce-system.ts
```

**Note:** Some examples require Redis/MongoDB setup.

#### complete-showcase.ts
**Complete Feature Showcase**
- All SDK features in one script
- Production-ready patterns
- Usage tracking
- Error handling
- Complete workflow

**Run:**
```bash
npx tsx examples/production/complete-showcase.ts
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional - for other providers
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
COHERE_API_KEY=...

# Optional - for sessions
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017

# Optional - for tracing
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Optional - model overrides
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Configuration Management

All examples use centralized configuration:

```typescript
import { getExampleConfig, validateConfig } from '../utils';

const config = getExampleConfig();
validateConfig(config, ['openai']); // Check required config
```

---

## 🛠️ Utilities

### Error Handling

Consistent error handling across all examples:

```typescript
import { handleError, isAPIKeyError } from '../utils/errors';

try {
  // Your code
} catch (error) {
  if (isAPIKeyError(error)) {
    handleError(error, 'API call');
  } else {
    handleError(error);
  }
}
```

### Logging

Structured logging:

```typescript
import { logger } from '../utils/logger';

logger.info('Starting example');
logger.success('Example completed');
logger.warn('Warning message');
logger.error('Error message');
logger.section('Section Title');
logger.step(1, 'Step Title');
```

---

## 📋 Prerequisites

### Required Dependencies

```bash
# Clone and install dependencies
git clone https://github.com/Manoj-tawk/tawk-agents-sdk.git
cd tawk-agents-sdk
npm install
```

### Optional Dependencies

```bash
# For Anthropic models
npm install @ai-sdk/anthropic

# For Google models
npm install @ai-sdk/google

# For Cohere reranking
npm install @ai-sdk/cohere

# For Redis sessions
npm install ioredis

# For MongoDB sessions
npm install mongodb
```

---

## 💡 Best Practices

1. **Start with all-features.ts** - Comprehensive reference for all features
2. **Use Environment Variables** - Never hardcode API keys
3. **Handle Errors Gracefully** - Use error utilities
4. **Monitor Usage** - Track tokens and costs
5. **Use Logging** - Consistent logging across examples
6. **Follow Structure** - Use the organized directory structure
7. **Test Examples** - Verify examples work before sharing

---

## 🎓 Learning Path

### For Beginners

1. Start with `all-features.ts` - Run individual examples
2. Study the code structure
3. Try modifying examples
4. Move to advanced examples when ready

### For Developers

1. Review `all-features.ts` for all features
2. Study production examples
3. Build your own applications
4. Contribute improvements

### For Experts

1. Review all examples
2. Study production patterns
3. Customize for your needs
4. Optimize for production

---

## 🐛 Troubleshooting

### Common Issues

**"API key is missing"**
- Check `.env` file has `OPENAI_API_KEY=sk-...`
- Verify `dotenv/config` is imported
- Use `checkAPIKey()` utility to verify

**"Module not found"**
- Run `npm install`
- Check import paths: `from '../../src'`
- Verify TypeScript configuration

**"Connection failed"**
- Check service availability (Redis, MongoDB)
- Verify connection strings
- Use `MemorySession` for testing

**"Example not found"**
- Check file exists in correct directory
- Verify naming convention
- Check `run.ts` configuration

---

## 📚 Additional Resources

- **[Documentation](../docs/)** - Complete API reference
- **[GETTING_STARTED.md](../docs/GETTING_STARTED.md)** - Step-by-step tutorial
- **[FEATURES.md](../docs/FEATURES.md)** - Full feature list
- **[API.md](../docs/API.md)** - Complete API documentation
- **[ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System design
- **[STRUCTURE.md](./STRUCTURE.md)** - Examples structure documentation

---

## 🤝 Contributing

### Adding New Examples

1. **Choose Category** - Place in appropriate directory (basic/intermediate/advanced/production)
2. **Follow Naming** - Use descriptive names with numbers for ordered examples
3. **Use Utilities** - Import from `utils/` directory
4. **Handle Errors** - Use error handling utilities
5. **Add Documentation** - Document in README
6. **Test Example** - Verify it works
7. **Update README** - Add to appropriate section

### Example Template

```typescript
/**
 * Example: [Title]
 * 
 * [Description]
 */

import 'dotenv/config';
import { Agent, run } from '../../src';
import { logger, handleError } from '../utils';
import { openai } from '@ai-sdk/openai';

async function main() {
  logger.section('Example: [Title]');
  
  try {
    // Your example code here
    
    logger.success('Example completed successfully!');
  } catch (error) {
    handleError(error, 'Example');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
```

---

## 📝 License

MIT © [Tawk.to](https://www.tawk.to)

---

**Ready to build amazing AI applications? Start with [`all-features.ts`](./all-features.ts)!** 🚀
