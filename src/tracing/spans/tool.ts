/**
 * Tool Span Helpers for OpenTelemetry
 * 
 * Provides helper functions for creating and managing tool execution spans
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tawk-agents-sdk', '1.0.0');

export interface ToolSpanOptions {
  inputSize?: number;
  toolType?: string;
}

/**
 * Execute a function with a tool span
 */
export async function withToolSpan<T>(
  parentSpan: Span | Context,
  toolName: string,
  fn: (span: Span) => Promise<T>,
  options: ToolSpanOptions = {}
): Promise<T> {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  const span = tracer.startSpan(`tool.${toolName}`, {
    attributes: {
      'tool.name': toolName,
      ...(options.toolType && { 'tool.type': options.toolType }),
      ...(options.inputSize !== undefined && { 'tool.input.size_bytes': options.inputSize }),
    },
  }, parentContext);

  const startTime = Date.now();

  // Add start event
  span.addEvent('tool.execute.start', {
    timestamp: startTime,
  });

  try {
    const result = await fn(span);
    const duration = Date.now() - startTime;

    // Calculate output size if result is serializable
    let outputSize = 0;
    try {
      const serialized = JSON.stringify(result);
      outputSize = Buffer.byteLength(serialized, 'utf8');
    } catch {
      // Ignore serialization errors
    }

    span.setAttributes({
      'tool.duration_ms': duration,
      'tool.success': true,
      ...(outputSize > 0 && { 'tool.output.size_bytes': outputSize }),
    });

    span.addEvent('tool.execute.complete', {
      timestamp: Date.now(),
      'tool.duration_ms': duration,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    span.setAttributes({
      'tool.duration_ms': duration,
      'tool.success': false,
      'error.message': error instanceof Error ? error.message : String(error),
    });

    span.addEvent('tool.execute.error', {
      timestamp: Date.now(),
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
 * Start a tool span manually (for cases where you need more control)
 */
export function startToolSpan(
  parentSpan: Span | Context,
  toolName: string,
  options: ToolSpanOptions = {}
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  return tracer.startSpan(`tool.${toolName}`, {
    attributes: {
      'tool.name': toolName,
      ...(options.toolType && { 'tool.type': options.toolType }),
      ...(options.inputSize !== undefined && { 'tool.input.size_bytes': options.inputSize }),
    },
  }, parentContext);
}

/**
 * End a tool span with success
 */
export function endToolSpan(span: Span, result?: any): void {
  if (result !== undefined) {
    try {
      const serialized = JSON.stringify(result);
      const outputSize = Buffer.byteLength(serialized, 'utf8');
      span.setAttribute('tool.output.size_bytes', outputSize);
    } catch {
      // Ignore serialization errors
    }
  }

  span.setAttribute('tool.success', true);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * End a tool span with error
 */
export function endToolSpanWithError(span: Span, error: Error): void {
  span.setAttribute('tool.success', false);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
  span.end();
}

