/**
 * Guardrails Shared Types
 * 
 * @module guardrails/types
 * @description Shared types and interfaces for all guardrail validators
 */

import type { Guardrail, GuardrailResult, RunContextWrapper } from '../core/agent';

export type { Guardrail, GuardrailResult, RunContextWrapper };

/**
 * Base configuration for all guardrails
 */
export interface GuardrailConfig {
  /** Custom name for the guardrail */
  name?: string;
  /** Whether to validate input or output */
  type: 'input' | 'output';
}

/**
 * Configuration for LLM-based guardrails
 */
export interface LLMGuardrailConfig extends GuardrailConfig {
  /** Language model to use for validation */
  model: any; // LanguageModel
  /** Confidence threshold (0-1) */
  threshold?: number;
}

/**
 * Configuration for content safety guardrail
 */
export interface ContentSafetyConfig extends LLMGuardrailConfig {
  /** Content categories to check */
  categories?: string[];
}

/**
 * Configuration for PII detection guardrail
 */
export interface PIIDetectionConfig extends GuardrailConfig {
  /** Whether to block content with PII */
  block?: boolean;
  /** PII categories to check */
  categories?: string[];
}

/**
 * Configuration for length guardrail
 */
export interface LengthGuardrailConfig extends GuardrailConfig {
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Unit of measurement */
  unit?: 'characters' | 'words' | 'tokens';
}

/**
 * Configuration for topic relevance guardrail
 */
export interface TopicRelevanceConfig extends LLMGuardrailConfig {
  /** List of allowed topics */
  allowedTopics: string[];
}

/**
 * Configuration for format validation guardrail
 */
export interface FormatValidationConfig extends GuardrailConfig {
  /** Expected format */
  format: 'json' | 'xml' | 'yaml' | 'markdown';
  /** Optional schema for validation */
  schema?: any; // z.ZodSchema
}

/**
 * Configuration for rate limit guardrail
 */
export interface RateLimitConfig extends GuardrailConfig {
  /** Storage for rate limit counters */
  storage: Map<string, { count: number; resetAt: number }>;
  /** Maximum requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Function to extract rate limit key */
  keyExtractor: (context: RunContextWrapper<any>) => string;
}

/**
 * Configuration for language guardrail
 */
export interface LanguageConfig extends LLMGuardrailConfig {
  /** Array of allowed language codes */
  allowedLanguages: string[];
}

/**
 * Configuration for sentiment guardrail
 */
export interface SentimentConfig extends LLMGuardrailConfig {
  /** Sentiments to block */
  blockedSentiments?: ('positive' | 'negative' | 'neutral')[];
  /** Sentiments to allow (whitelist) */
  allowedSentiments?: ('positive' | 'negative' | 'neutral')[];
}

/**
 * Configuration for toxicity guardrail
 */
export interface ToxicityConfig extends LLMGuardrailConfig {
  /** Toxicity threshold (0-10 scale) */
  threshold?: number;
}

/**
 * Configuration for custom guardrail
 */
export interface CustomGuardrailConfig<TContext = any> extends GuardrailConfig {
  /** Custom validation function */
  validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}

