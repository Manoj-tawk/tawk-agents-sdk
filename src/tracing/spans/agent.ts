/**
 * Agent Span Helpers for OpenTelemetry
 * 
 * Provides helper functions for creating and managing agent-related spans
 */

import { trace, Span, SpanStatusCode, Context, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tawk-agents-sdk', '1.0.0');

export interface AgentRunSpanOptions {
  maxTurns?: number;
  sessionId?: string;
  userId?: string;
  inputType?: string;
  inputLength?: number;
}

export interface AgentStepSpanOptions {
  toolsCount?: number;
  handoffsCount?: number;
  turnNumber?: number;
}

export interface AgentMetrics {
  duration: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  toolCalls: number;
  handoffs: number;
  steps: number;
}

/**
 * Start a root span for an agent run
 */
export function startAgentRunSpan(
  agentName: string,
  options: AgentRunSpanOptions = {}
): Span {
  return tracer.startSpan('agent.run', {
    attributes: {
      'agent.name': agentName,
      'agent.max_turns': options.maxTurns || 50,
      'input.type': options.inputType || 'unknown',
      'input.length': options.inputLength || 0,
      ...(options.sessionId && { 'session.id': options.sessionId }),
      ...(options.userId && { 'user.id': options.userId }),
    },
  });
}

/**
 * Start a span for an agent step
 */
export function startAgentStepSpan(
  parentSpan: Span | Context,
  stepNumber: number,
  agentName: string,
  options: AgentStepSpanOptions = {}
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  return tracer.startSpan('agent.step', {
    attributes: {
      'agent.step_number': stepNumber,
      'agent.name': agentName,
      'agent.tools.available': options.toolsCount || 0,
      'agent.handoffs.available': options.handoffsCount || 0,
      ...(options.turnNumber && { 'agent.turn_number': options.turnNumber }),
    },
  }, parentContext);
}

/**
 * Start a span for agent handoff
 */
export function startHandoffSpan(
  parentSpan: Span | Context,
  fromAgent: string,
  toAgent: string,
  reason?: string
): Span {
  const parentContext = ('spanContext' in parentSpan)
    ? trace.setSpan(context.active(), parentSpan as Span)
    : parentSpan;
  
  return tracer.startSpan('agent.handoff', {
    attributes: {
      'handoff.from_agent': fromAgent,
      'handoff.to_agent': toAgent,
      ...(reason && { 'handoff.reason': reason }),
    },
  }, parentContext);
}

/**
 * Record agent metrics on a span
 */
export function recordAgentMetrics(
  span: Span,
  metrics: AgentMetrics
): void {
  span.setAttributes({
    'agent.duration_ms': metrics.duration,
    'llm.tokens.input': metrics.tokens.input,
    'llm.tokens.output': metrics.tokens.output,
    'llm.tokens.total': metrics.tokens.total,
    'tool.calls.count': metrics.toolCalls,
    'agent.handoffs.count': metrics.handoffs,
    'agent.steps.count': metrics.steps,
  });
}

/**
 * End an agent span with success status
 */
export function endAgentSpan(span: Span, metrics?: AgentMetrics): void {
  if (metrics) {
    recordAgentMetrics(span, metrics);
  }
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * End an agent span with error status
 */
export function endAgentSpanWithError(span: Span, error: Error): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
  span.end();
}

