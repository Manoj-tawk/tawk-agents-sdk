/**
 * Content Safety Guardrail
 * 
 * @module guardrails/validators/content-safety
 * @description LLM-powered content moderation guardrail
 */

import { generateText } from 'ai';
import { z } from 'zod';
import type { Guardrail } from '../types';
import { createGuardrailGeneration, endGuardrailGeneration } from '../utils';

export interface ContentSafetyConfig {
  name?: string;
  type: 'input' | 'output';
  model: any;
  categories?: string[];
  threshold?: number;
}

/**
 * Create a guardrail that blocks harmful or inappropriate content.
 * Uses an AI model to classify content safety.
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
export function contentSafetyGuardrail<TContext = any>(
  config: ContentSafetyConfig
): Guardrail<TContext> {
  return {
    name: config.name || 'content_safety',
    type: config.type,
    validate: async (content: string) => {
      const categories = config.categories || [
        'hate speech',
        'violence',
        'sexual content',
        'harassment',
        'self-harm'
      ];

      const generation = createGuardrailGeneration({
        name: config.name || 'content_safety',
        model: config.model,
        systemPrompt: `You are a content moderation system. Analyze the following text and determine if it contains any of these categories: ${categories.join(', ')}. Respond with a JSON object.`,
        content,
        type: config.type,
        metadata: { categories }
      });

      const result = await generateText({
        model: config.model,
        system: `You are a content moderation system. Analyze the following text and determine if it contains any of these categories: ${categories.join(', ')}. Respond with a JSON object.`,
        prompt: content,
        tools: {
          classify: {
            description: 'Classify content safety',
            inputSchema: z.object({
              isSafe: z.boolean(),
              detectedCategories: z.array(z.string()),
              confidence: z.number()
            }),
            execute: async (args: any) => args
          }
        } as any
      });

      const classification = result.toolCalls?.[0]?.input as any;

      endGuardrailGeneration(generation, result, !classification || classification.isSafe);

      if (!classification || classification.isSafe) {
        return { passed: true };
      }

      return {
        passed: false,
        message: `Content contains: ${classification.detectedCategories?.join(', ') || 'unsafe content'}`,
        metadata: classification
      };
    }
  };
}





