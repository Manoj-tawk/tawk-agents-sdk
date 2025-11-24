# Examples Directory Structure

This document describes the production-standard organization of the examples directory.

## Directory Layout

```
examples/
├── README.md                 # Main documentation
├── STRUCTURE.md              # This file
├── run.ts                    # Example runner script (auto-discovers examples)
├── all-features.ts           # Comprehensive reference (all 15 examples)
│
├── basic/                    # Beginner-friendly examples (coming soon)
├── intermediate/             # Intermediate examples (coming soon)
│
├── advanced/                 # Advanced examples
│   ├── 09-embeddings-rag.ts
│   ├── 10-vision.ts
│   └── 11-toon-format.ts
│
├── production/               # Production-ready examples
│   ├── ecommerce-system.ts
│   └── complete-showcase.ts
│
└── utils/                    # Shared utilities
    ├── config.ts            # Configuration management
    ├── errors.ts            # Error handling
    ├── logger.ts            # Logging utilities
    └── index.ts             # Exports
```

## File Organization

### Naming Convention

- **Advanced**: Numbered files (09-, 10-, 11-)
- **Production**: Descriptive names (ecommerce-system.ts, complete-showcase.ts)
- **Utilities**: Descriptive names (config.ts, errors.ts)

### Import Paths

All examples use relative imports:

```typescript
// SDK imports
import { Agent, run } from '../../src';

// Utility imports
import { logger, handleError } from '../utils';
```

## Utilities

### Configuration (`utils/config.ts`)

Centralized configuration management:

```typescript
import { getExampleConfig, validateConfig } from '../utils';

const config = getExampleConfig();
validateConfig(config, ['openai']);
```

### Error Handling (`utils/errors.ts`)

Consistent error handling:

```typescript
import { handleError, isAPIKeyError } from '../utils/errors';

try {
  // code
} catch (error) {
  if (isAPIKeyError(error)) {
    handleError(error, 'Context');
  }
}
```

### Logging (`utils/logger.ts`)

Structured logging:

```typescript
import { logger } from '../utils/logger';

logger.section('Title');
logger.step(1, 'Step Title');
logger.info('Message');
logger.success('Success');
logger.warn('Warning');
logger.error('Error');
```

## Example Template

All examples should follow this structure:

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
    // Example code here
    
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

## Running Examples

### Using the Runner

The runner automatically discovers examples from the filesystem:

```bash
# Run all examples
npx tsx examples/run.ts

# Run by category
npx tsx examples/run.ts --category advanced
npx tsx examples/run.ts --category production

# Run specific example
npx tsx examples/run.ts --example 09-embeddings-rag
npx tsx examples/run.ts --example ecommerce-system

# Verbose logging
npx tsx examples/run.ts --verbose
```

### Direct Execution

```bash
# Run individual example
npx tsx examples/advanced/09-embeddings-rag.ts
npx tsx examples/production/ecommerce-system.ts

# Run comprehensive reference
npx tsx examples/all-features.ts
npx tsx examples/all-features.ts "basic-agent"
```

## Best Practices

1. **Use Utilities** - Always use utilities for config, errors, and logging
2. **Handle Errors** - Wrap all API calls in try-catch
3. **Export main** - Export main function for runner compatibility
4. **Document** - Add JSDoc comments
5. **Test** - Verify examples work before committing
6. **Consistent** - Follow the template structure
