/**
 * Tawk Agents SDK
 *
 * Production-ready AI agent framework built on Vercel AI SDK.
 * Enterprise-grade multi-agent orchestration with comprehensive observability.
 *
 * @packageDocumentation
 * @module tawk-agents-sdk
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 *
 * @example Basic Agent
 * ```typescript
 * import { Agent, run } from 'tawk-agents-sdk';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   name: 'Assistant',
 *   model: openai('gpt-4o'),
 *   instructions: 'You are a helpful assistant.'
 * });
 *
 * const result = await run(agent, 'Hello!');
 * console.log(result.finalOutput);
 * ```
 *
 * @example Multi-Agent System
 * ```typescript
 * const specialist = new Agent({ name: 'Specialist', ... });
 * const coordinator = new Agent({
 *   name: 'Coordinator',
 *   subagents: [specialist]
 * });
 *
 * const result = await run(coordinator, 'Complex task');
 * ```
 *
 * @see {@link https://github.com/Manoj-tawk/tawk-agents-sdk Documentation}
 */
export { Agent, run, runStream, tool, setDefaultModel, type AgentConfig, type CoreTool, type RunContextWrapper, type RunOptions, type RunResult, type StreamResult, } from './core/agent';
export { AgenticRunner, type StreamEvent } from './core/runner';
export { Usage } from './core/usage';
export { createTransferTools, detectTransfer, createTransferContext, } from './core/transfers';
export type { TransferResult } from './core/transfers';
export { RunState } from './core/runstate';
export type { RunItem, RunItemType, RunMessageItem, RunToolCallItem, RunToolResultItem, ModelResponse, } from './core/runstate';
export { withTrace, getCurrentTrace, getCurrentSpan, setCurrentSpan, createContextualSpan, createContextualGeneration, runWithTraceContext, } from './tracing/context';
export { initializeLangfuse as initLangfuse, getLangfuse, isLangfuseEnabled } from './lifecycle/langfuse';
export { lengthGuardrail, piiDetectionGuardrail, customGuardrail, contentSafetyGuardrail, topicRelevanceGuardrail, sentimentGuardrail, toxicityGuardrail, languageGuardrail, rateLimitGuardrail, } from './guardrails';
export type { Guardrail, GuardrailResult, } from './core/agent';
export { SessionManager, MemorySession, } from './sessions';
export type { Session, } from './sessions';
export { user, assistant, system, toolMessage, getLastTextContent, filterMessagesByRole, extractAllText } from './helpers/message';
export { safeExecute } from './helpers/safe-execute';
export type { SafeExecuteResult } from './helpers/safe-execute';
export { AgentHooks, RunHooks } from './lifecycle';
export type { AgentHookEvents, RunHookEvents } from './lifecycle';
export type { Expand, DeepPartial, Prettify, UnwrapPromise, } from './types/helpers';
//# sourceMappingURL=index.d.ts.map