/**
 * Session Span Helpers for OpenTelemetry
 * 
 * Provides helper functions for creating and managing session-related spans
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tawk-agents-sdk', '1.0.0');

export interface SessionSpanOptions {
  sessionType?: string;
  messageCount?: number;
}

/**
 * Execute a session operation with a span
 */
export async function withSessionSpan<T>(
  parentSpan: Span | Context,
  operation: 'save' | 'load' | 'clear',
  sessionId: string,
  fn: (span: Span) => Promise<T>,
  options: SessionSpanOptions = {}
): Promise<T> {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  const span = tracer.startSpan(`session.${operation}`, {
    attributes: {
      'session.id': sessionId,
      'session.operation': operation,
      ...(options.sessionType && { 'session.type': options.sessionType }),
      ...(options.messageCount !== undefined && { 'session.message_count': options.messageCount }),
    },
  }, parentContext);

  const startTime = Date.now();

  try {
    const result = await fn(span);
    const duration = Date.now() - startTime;

    span.setAttributes({
      'session.duration_ms': duration,
      'session.success': true,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    span.setAttributes({
      'session.duration_ms': duration,
      'session.success': false,
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
 * Start a session span manually
 */
export function startSessionSpan(
  parentSpan: Span | Context,
  operation: 'save' | 'load' | 'clear',
  sessionId: string,
  options: SessionSpanOptions = {}
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  return tracer.startSpan(`session.${operation}`, {
    attributes: {
      'session.id': sessionId,
      'session.operation': operation,
      ...(options.sessionType && { 'session.type': options.sessionType }),
      ...(options.messageCount !== undefined && { 'session.message_count': options.messageCount }),
    },
  }, parentContext);
}

/**
 * End a session span with success
 */
export function endSessionSpan(span: Span): void {
  span.setAttribute('session.success', true);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * End a session span with error
 */
export function endSessionSpanWithError(span: Span, error: Error): void {
  span.setAttribute('session.success', false);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
  span.end();
}

