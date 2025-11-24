/**
 * Example Configuration
 * 
 * Centralized configuration for all examples
 */

import 'dotenv/config';

export interface ExampleConfig {
  openai: {
    apiKey: string | undefined;
    model: string;
    embeddingModel: string;
  };
  anthropic: {
    apiKey: string | undefined;
    model: string;
  };
  redis: {
    url: string | undefined;
    enabled: boolean;
  };
  mongodb: {
    uri: string | undefined;
    enabled: boolean;
  };
  tracing: {
    langfuse: {
      publicKey: string | undefined;
      secretKey: string | undefined;
      host: string;
      enabled: boolean;
    };
  };
}

/**
 * Get example configuration from environment variables
 */
export function getExampleConfig(): ExampleConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    },
    redis: {
      url: process.env.REDIS_URL,
      enabled: !!process.env.REDIS_URL,
    },
    mongodb: {
      uri: process.env.MONGODB_URI,
      enabled: !!process.env.MONGODB_URI,
    },
    tracing: {
      langfuse: {
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
        enabled: !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY),
      },
    },
  };
}

/**
 * Validate required configuration
 */
export function validateConfig(config: ExampleConfig, required: string[]): void {
  const missing: string[] = [];

  if (required.includes('openai') && !config.openai.apiKey) {
    missing.push('OPENAI_API_KEY');
  }

  if (required.includes('anthropic') && !config.anthropic.apiKey) {
    missing.push('ANTHROPIC_API_KEY');
  }

  if (required.includes('redis') && !config.redis.enabled) {
    missing.push('REDIS_URL');
  }

  if (required.includes('mongodb') && !config.mongodb.enabled) {
    missing.push('MONGODB_URI');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}\n` +
      `Please set these in your .env file or environment variables.`
    );
  }
}

