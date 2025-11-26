/**
 * Guardrail Span Helpers for OpenTelemetry
 * 
 * Provides helper functions for creating and managing guardrail spans
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tawk-agents-sdk', '1.0.0');

export interface GuardrailSpanOptions {
  inputSize?: number;
  outputSize?: number;
}

/**
 * Execute a guardrail check with a span
 */
export async function withGuardrailSpan<T>(
  parentSpan: Span | Context,
  guardrailName: string,
  type: 'input' | 'output',
  fn: (span: Span) => Promise<T>,
  options: GuardrailSpanOptions = {}
): Promise<T> {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  const span = tracer.startSpan(`guardrail.${type}`, {
    attributes: {
      'guardrail.name': guardrailName,
      'guardrail.type': type,
      ...(options.inputSize !== undefined && { 'guardrail.input.size_bytes': options.inputSize }),
      ...(options.outputSize !== undefined && { 'guardrail.output.size_bytes': options.outputSize }),
    },
  }, parentContext);

  const startTime = Date.now();

  try {
    const result = await fn(span);
    const duration = Date.now() - startTime;

    span.setAttributes({
      'guardrail.passed': true,
      'guardrail.duration_ms': duration,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    span.setAttributes({
      'guardrail.passed': false,
      'guardrail.duration_ms': duration,
      'error.message': error instanceof Error ? error.message : String(error),
    });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });

    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.end();

    throw error;
  }
}

/**
 * Start a guardrail span manually
 */
export function startGuardrailSpan(
  parentSpan: Span | Context,
  guardrailName: string,
  type: 'input' | 'output',
  options: GuardrailSpanOptions = {}
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  return tracer.startSpan(`guardrail.${type}`, {
    attributes: {
      'guardrail.name': guardrailName,
      'guardrail.type': type,
      ...(options.inputSize !== undefined && { 'guardrail.input.size_bytes': options.inputSize }),
      ...(options.outputSize !== undefined && { 'guardrail.output.size_bytes': options.outputSize }),
    },
  }, parentContext);
}

/**
 * End a guardrail span with result
 */
export function endGuardrailSpan(span: Span, passed: boolean, message?: string): void {
  span.setAttributes({
    'guardrail.passed': passed,
    ...(message && { 'guardrail.message': message }),
  });

  span.setStatus({
    code: passed ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    ...(message && { message }),
  });

  span.end();
}

