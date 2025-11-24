#!/usr/bin/env node
/**
 * Example Runner
 * 
 * Run examples by category or individually
 * 
 * Usage:
 *   npx tsx examples/run.ts                    # Run all examples
 *   npx tsx examples/run.ts --category basic   # Run all basic examples
 *   npx tsx examples/run.ts --example 01-basic-agent  # Run specific example
 *   npx tsx examples/run.ts --verbose          # Verbose logging
 */

import { logger } from './utils/logger';
import { getExampleConfig, checkAPIKey } from './utils';
import * as path from 'path';
import * as fs from 'fs';

interface ExampleInfo {
  file: string;
  name: string;
  category: string;
  description?: string;
}

// Dynamically discover examples from filesystem
function discoverExamples(): Record<string, ExampleInfo[]> {
  const examples: Record<string, ExampleInfo[]> = {
    basic: [],
    intermediate: [],
    advanced: [],
    production: [],
  };

  const categories = ['basic', 'intermediate', 'advanced', 'production'] as const;

  for (const category of categories) {
    const categoryPath = path.join(__dirname, category);
    if (fs.existsSync(categoryPath)) {
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
        .sort();

      for (const file of files) {
        const name = file.replace('.ts', '');
        examples[category].push({
          file: `${category}/${file}`,
          name,
          category,
          description: getDescriptionFromName(name),
        });
      }
    }
  }

  return examples;
}

function getDescriptionFromName(name: string): string {
  const descriptions: Record<string, string> = {
    '09-embeddings-rag': 'Embeddings & RAG system',
    '10-vision': 'Vision and image analysis',
    '11-toon-format': 'TOON format for efficient encoding',
    'ecommerce-system': 'Complete e-commerce system',
    'complete-showcase': 'Complete feature showcase',
  };

  return descriptions[name] || name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Discover examples at runtime
const EXAMPLES = discoverExamples();

function parseArgs(): { category?: string; example?: string; verbose: boolean } {
  const args = process.argv.slice(2);
  const result: { category?: string; example?: string; verbose: boolean } = { verbose: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      result.category = args[i + 1];
      i++;
    } else if (args[i] === '--example' && args[i + 1]) {
      result.example = args[i + 1];
      i++;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

function findExample(name: string): ExampleInfo | null {
  for (const category of Object.values(EXAMPLES)) {
    const example = category.find(e => e.name === name || e.file.includes(name));
    if (example) return example;
  }
  return null;
}

function getAllExamples(): ExampleInfo[] {
  return Object.values(EXAMPLES).flat();
}

function checkConfig(): void {
  const config = getExampleConfig();
  const status = {
    openai: checkAPIKey('openai') ? '✅' : '⚠️ ',
    anthropic: checkAPIKey('anthropic') ? '✅' : '⚠️ ',
  };

  logger.info('Configuration Status:');
  logger.info(`  OpenAI: ${status.openai} ${config.openai.apiKey ? 'Configured' : 'Missing'}`);
  logger.info(`  Anthropic: ${status.anthropic} ${config.anthropic.apiKey ? 'Configured' : 'Missing'}`);

  if (!config.openai.apiKey) {
    logger.warn('OPENAI_API_KEY is not set. Some examples may not work.');
  }
}

async function runExample(example: ExampleInfo): Promise<boolean> {
  const examplePath = path.join(__dirname, example.file);

  if (!fs.existsSync(examplePath)) {
    logger.error(`Example file not found: ${example.file}`);
    return false;
  }

  logger.section(`Running: ${example.name}`);
  if (example.description) {
    logger.info(`Description: ${example.description}`);
  }

  try {
    // Dynamically import and run the example
    const module = await import(examplePath);
    if (module.main) {
      await module.main();
    } else {
      logger.warn('Example does not export a main function');
    }
    logger.success(`Completed: ${example.name}`);
    return true;
  } catch (error) {
    logger.error(`Failed: ${example.name}`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return false;
  }
}

async function main() {
  const args = parseArgs();

  if (args.verbose) {
    logger.setLevel(0); // DEBUG
  }

  logger.section('Tawk Agents SDK - Example Runner');
  checkConfig();

  if (args.example) {
    // Run specific example
    const example = findExample(args.example);
    if (!example) {
      logger.error(`Example not found: ${args.example}`);
      logger.info('Available examples:');
      getAllExamples().forEach(e => {
        logger.info(`  - ${e.name} (${e.category})`);
      });
      process.exit(1);
    }
    await runExample(example);
  } else if (args.category) {
    // Run all examples in category
    const examples = EXAMPLES[args.category];
    if (!examples) {
      logger.error(`Category not found: ${args.category}`);
      logger.info('Available categories: basic, intermediate, advanced, production');
      process.exit(1);
    }

    logger.info(`Running ${examples.length} examples in category: ${args.category}`);
    for (const example of examples) {
      await runExample(example);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between examples
    }
  } else {
    // Run all examples
    logger.info('Running all examples...');
    const allExamples = getAllExamples();
    
    for (const example of allExamples) {
      await runExample(example);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between examples
    }
  }

  logger.section('Example Runner Complete');
}

if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:');
    console.error(error);
    process.exit(1);
  });
}

export { main, EXAMPLES };

