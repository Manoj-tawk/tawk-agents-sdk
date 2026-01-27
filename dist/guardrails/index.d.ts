/**
 * Guardrails System
 *
 * @module guardrails
 * @description
 * Production-ready input/output validation and safety guardrails.
 *
 * **Available Guardrails**:
 * - Content Safety: Block harmful or inappropriate content
 * - Length Control: Enforce output length constraints
 * - PII Detection: Detect and filter personal information
 * - Topic Relevance: Ensure responses stay on-topic
 * - Sentiment Analysis: Control response tone
 * - Toxicity Detection: Filter toxic content
 * - Language Detection: Enforce language requirements
 * - Rate Limiting: Control execution frequency
 * - Custom Guardrails: Build your own validators
 *
 * **Features**:
 * - AI-powered validation for advanced checks
 * - Regex-based validation for simple checks
 * - Automatic feedback generation for regeneration
 * - Comprehensive error handling
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
import type { Guardrail, GuardrailResult, RunContextWrapper } from '../core/agent';
import { z } from 'zod';
/**
 * Create a guardrail that blocks harmful or inappropriate content.
 * Uses an AI model to classify content safety.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {LanguageModel} config.model - Model to use for content classification
 * @param {string[]} [config.categories] - Categories to check (default: hate speech, violence, sexual content, harassment, self-harm)
 * @param {number} [config.threshold] - Confidence threshold for blocking
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = contentSafetyGuardrail({
 *   type: 'input',
 *   model: openai('gpt-4o-mini'),
 *   categories: ['violence', 'hate-speech']
 * });
 * ```
 */
export declare function contentSafetyGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    model: any;
    categories?: string[];
    threshold?: number;
}): Guardrail<TContext>;
/**
 * Create a guardrail that detects and optionally blocks PII (Personally Identifiable Information).
 * Uses regex patterns to detect emails, phone numbers, SSNs, credit cards, and IP addresses.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {boolean} [config.block] - If true, block content with PII; if false, just warn (default: true)
 * @param {string[]} [config.categories] - PII categories to check (email, phone, ssn, creditCard, ipAddress)
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = piiDetectionGuardrail({
 *   type: 'output',
 *   block: true
 * });
 * ```
 */
export declare function piiDetectionGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    block?: boolean;
    categories?: string[];
}): Guardrail<TContext>;
/**
 * Create a guardrail that validates content length.
 * Supports validation by characters, words, or tokens.
 *
 * When unit is 'tokens', the guardrail uses the agent's tokenizerFn
 * for accurate token counting.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {number} [config.minLength] - Minimum length required
 * @param {number} [config.maxLength] - Maximum length allowed
 * @param {'characters' | 'words' | 'tokens'} [config.unit] - Unit for length measurement (default: 'characters')
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = lengthGuardrail({
 *   type: 'output',
 *   maxLength: 1000,
 *   unit: 'tokens'
 * });
 * ```
 */
export declare function lengthGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    minLength?: number;
    maxLength?: number;
    unit?: 'characters' | 'words' | 'tokens';
}): Guardrail<TContext>;
/**
 * Create a guardrail that ensures content is relevant to allowed topics.
 * Uses an AI model to analyze topic relevance.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {LanguageModel} config.model - Model to use for topic analysis
 * @param {string[]} config.allowedTopics - List of allowed topics
 * @param {number} [config.threshold] - Minimum relevance score (0-10)
 * @returns {Guardrail<TContext>} Guardrail instance
 */
export declare function topicRelevanceGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    model: any;
    allowedTopics: string[];
    threshold?: number;
}): Guardrail<TContext>;
/**
 * Create a guardrail that validates content format (JSON, XML, YAML, Markdown).
 * Optionally validates against a Zod schema for structured data.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {'json' | 'xml' | 'yaml' | 'markdown'} config.format - Expected format
 * @param {z.ZodSchema} [config.schema] - Optional Zod schema for validation
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = formatValidationGuardrail({
 *   type: 'output',
 *   format: 'json',
 *   schema: z.object({ name: z.string(), age: z.number() })
 * });
 * ```
 */
export declare function formatValidationGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    format: 'json' | 'xml' | 'yaml' | 'markdown';
    schema?: z.ZodSchema;
}): Guardrail<TContext>;
/**
 * Create a custom guardrail with your own validation function.
 * Provides maximum flexibility for custom validation logic.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} config.name - Unique name for the guardrail
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {Function} config.validate - Validation function
 * @param {string} config.validate.content - Content to validate
 * @param {RunContextWrapper} config.validate.context - Execution context
 * @returns {Promise<GuardrailResult> | GuardrailResult} Validation result
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = customGuardrail({
 *   name: 'business-hours',
 *   type: 'input',
 *   validate: async (content, context) => {
 *     const hour = new Date().getHours();
 *     return {
 *       passed: hour >= 9 && hour <= 17,
 *       message: 'Service only available 9 AM - 5 PM'
 *     };
 *   }
 * });
 * ```
 */
export declare function customGuardrail<TContext = any>(config: {
    name: string;
    type: 'input' | 'output';
    validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}): Guardrail<TContext>;
/**
 * Create a guardrail that enforces rate limiting based on a key extracted from context.
 * Uses an in-memory Map for tracking requests (consider Redis for distributed systems).
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {Map} config.storage - Map for storing rate limit counters (key -> { count, resetAt })
 * @param {number} config.maxRequests - Maximum requests allowed per window
 * @param {number} config.windowMs - Time window in milliseconds
 * @param {Function} config.keyExtractor - Function to extract rate limit key from context
 * @param {RunContextWrapper} config.keyExtractor.context - Execution context
 * @returns {string} Rate limit key (e.g., user ID, session ID)
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const storage = new Map();
 * const guardrail = rateLimitGuardrail({
 *   storage,
 *   maxRequests: 10,
 *   windowMs: 60000, // 1 minute
 *   keyExtractor: (context) => context.context.userId
 * });
 * ```
 */
export declare function rateLimitGuardrail<TContext = any>(config: {
    name?: string;
    storage: Map<string, {
        count: number;
        resetAt: number;
    }>;
    maxRequests: number;
    windowMs: number;
    keyExtractor: (context: RunContextWrapper<TContext>) => string;
}): Guardrail<TContext>;
/**
 * Create a guardrail that ensures content is in allowed language(s).
 * Uses an AI model to detect the language of the content.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {LanguageModel} config.model - Model to use for language detection
 * @param {string[]} config.allowedLanguages - Array of ISO 639-1 language codes (e.g., ['en', 'es', 'fr'])
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = languageGuardrail({
 *   type: 'input',
 *   model: openai('gpt-4o-mini'),
 *   allowedLanguages: ['en', 'es']
 * });
 * ```
 */
export declare function languageGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    model: any;
    allowedLanguages: string[];
}): Guardrail<TContext>;
/**
 * Create a guardrail that blocks or allows content based on sentiment.
 * Uses an AI model to analyze sentiment (positive, negative, neutral).
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {LanguageModel} config.model - Model to use for sentiment analysis
 * @param {Array<'positive' | 'negative' | 'neutral'>} [config.blockedSentiments] - Sentiments to block
 * @param {Array<'positive' | 'negative' | 'neutral'>} [config.allowedSentiments] - Sentiments to allow (whitelist)
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = sentimentGuardrail({
 *   type: 'output',
 *   model: openai('gpt-4o-mini'),
 *   blockedSentiments: ['negative']
 * });
 * ```
 */
export declare function sentimentGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    model: any;
    blockedSentiments?: ('positive' | 'negative' | 'neutral')[];
    allowedSentiments?: ('positive' | 'negative' | 'neutral')[];
}): Guardrail<TContext>;
/**
 * Create a guardrail that detects and blocks toxic content.
 * Uses an AI model to analyze content toxicity on a 0-10 scale.
 *
 * @template TContext - Type of context object
 *
 * @param {Object} config - Guardrail configuration
 * @param {string} [config.name] - Custom guardrail name
 * @param {'input' | 'output'} config.type - Whether to validate input or output
 * @param {LanguageModel} config.model - Model to use for toxicity detection
 * @param {number} [config.threshold] - Toxicity threshold (0-10 scale, default: 5)
 * @returns {Guardrail<TContext>} Guardrail instance
 *
 * @example
 * ```typescript
 * const guardrail = toxicityGuardrail({
 *   type: 'input',
 *   model: openai('gpt-4o-mini'),
 *   threshold: 7
 * });
 * ```
 */
export declare function toxicityGuardrail<TContext = any>(config: {
    name?: string;
    type: 'input' | 'output';
    model: any;
    threshold?: number;
}): Guardrail<TContext>;
export declare const guardrails: {
    contentSafety: typeof contentSafetyGuardrail;
    piiDetection: typeof piiDetectionGuardrail;
    length: typeof lengthGuardrail;
    topicRelevance: typeof topicRelevanceGuardrail;
    formatValidation: typeof formatValidationGuardrail;
    custom: typeof customGuardrail;
    rateLimit: typeof rateLimitGuardrail;
    language: typeof languageGuardrail;
    sentiment: typeof sentimentGuardrail;
    toxicity: typeof toxicityGuardrail;
};
//# sourceMappingURL=index.d.ts.map