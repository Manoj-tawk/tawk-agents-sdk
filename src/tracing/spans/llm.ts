/**
 * LLM Span Helpers for OpenTelemetry
 * 
 * Provides helper functions for creating and managing LLM-related spans
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tawk-agents-sdk', '1.0.0');

export interface LLMSpanOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface LLMResult {
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  finishReason: string;
  duration: number;
  model?: string;
  provider?: string;
}

/**
 * Start a span for LLM generation
 */
export function startLLMSpan(
  parentSpan: Span | Context,
  model: string,
  provider: string,
  options: LLMSpanOptions = {}
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  const span = tracer.startSpan('llm.generate', {
    attributes: {
      'llm.system': provider,
      'llm.model': model,
      ...(options.temperature !== undefined && { 'llm.temperature': options.temperature }),
      ...(options.maxTokens !== undefined && { 'llm.max_tokens': options.maxTokens }),
      ...(options.topP !== undefined && { 'llm.top_p': options.topP }),
      ...(options.presencePenalty !== undefined && { 'llm.presence_penalty': options.presencePenalty }),
      ...(options.frequencyPenalty !== undefined && { 'llm.frequency_penalty': options.frequencyPenalty }),
    },
  }, parentContext);

  // Add event for generation start
  span.addEvent('llm.generate.start', {
    timestamp: Date.now(),
  });

  return span;
}

/**
 * End an LLM span with result data
 */
export function endLLMSpan(span: Span, result: LLMResult): void {
  span.setAttributes({
    'llm.tokens.input': result.tokens.input,
    'llm.tokens.output': result.tokens.output,
    'llm.tokens.total': result.tokens.total,
    'llm.finish_reason': result.finishReason,
    'llm.duration_ms': result.duration,
      ...(result.model && { 'llm.model': result.model }),
      ...(result.provider && { 'llm.system': result.provider }),
  });

  // Add event for generation complete
  span.addEvent('llm.generate.complete', {
    timestamp: Date.now(),
    'llm.tokens.total': result.tokens.total,
    'llm.finish_reason': result.finishReason,
  });

  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * End an LLM span with error
 */
export function endLLMSpanWithError(span: Span, error: Error): void {
  span.addEvent('llm.generate.error', {
    timestamp: Date.now(),
    'error.message': error.message,
  });

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
  span.end();
}

