"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunHooks = exports.AgentHooks = exports.safeExecute = exports.extractAllText = exports.filterMessagesByRole = exports.getLastTextContent = exports.toolMessage = exports.system = exports.assistant = exports.user = exports.MemorySession = exports.SessionManager = exports.rateLimitGuardrail = exports.languageGuardrail = exports.toxicityGuardrail = exports.sentimentGuardrail = exports.topicRelevanceGuardrail = exports.contentSafetyGuardrail = exports.customGuardrail = exports.piiDetectionGuardrail = exports.lengthGuardrail = exports.isLangfuseEnabled = exports.getLangfuse = exports.initLangfuse = exports.runWithTraceContext = exports.createContextualGeneration = exports.createContextualSpan = exports.setCurrentSpan = exports.getCurrentSpan = exports.getCurrentTrace = exports.withTrace = exports.RunState = exports.createTransferContext = exports.detectTransfer = exports.createTransferTools = exports.Usage = exports.AgenticRunner = exports.setDefaultModel = exports.tool = exports.runStream = exports.run = exports.Agent = void 0;
// ============================================
// CORE AGENT & EXECUTION
// ============================================
var agent_1 = require("./core/agent");
// Agent class
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return agent_1.Agent; } });
// Run functions
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return agent_1.run; } });
Object.defineProperty(exports, "runStream", { enumerable: true, get: function () { return agent_1.runStream; } });
// Tool function
Object.defineProperty(exports, "tool", { enumerable: true, get: function () { return agent_1.tool; } });
// Utilities
Object.defineProperty(exports, "setDefaultModel", { enumerable: true, get: function () { return agent_1.setDefaultModel; } });
// Runner with streaming
var runner_1 = require("./core/runner");
Object.defineProperty(exports, "AgenticRunner", { enumerable: true, get: function () { return runner_1.AgenticRunner; } });
// Usage tracking
var usage_1 = require("./core/usage");
Object.defineProperty(exports, "Usage", { enumerable: true, get: function () { return usage_1.Usage; } });
// Transfers system
var transfers_1 = require("./core/transfers");
Object.defineProperty(exports, "createTransferTools", { enumerable: true, get: function () { return transfers_1.createTransferTools; } });
Object.defineProperty(exports, "detectTransfer", { enumerable: true, get: function () { return transfers_1.detectTransfer; } });
Object.defineProperty(exports, "createTransferContext", { enumerable: true, get: function () { return transfers_1.createTransferContext; } });
// Run state management
var runstate_1 = require("./core/runstate");
Object.defineProperty(exports, "RunState", { enumerable: true, get: function () { return runstate_1.RunState; } });
// ============================================
// TRACING & OBSERVABILITY
// ============================================
// Tracing context
var context_1 = require("./tracing/context");
Object.defineProperty(exports, "withTrace", { enumerable: true, get: function () { return context_1.withTrace; } });
Object.defineProperty(exports, "getCurrentTrace", { enumerable: true, get: function () { return context_1.getCurrentTrace; } });
Object.defineProperty(exports, "getCurrentSpan", { enumerable: true, get: function () { return context_1.getCurrentSpan; } });
Object.defineProperty(exports, "setCurrentSpan", { enumerable: true, get: function () { return context_1.setCurrentSpan; } });
Object.defineProperty(exports, "createContextualSpan", { enumerable: true, get: function () { return context_1.createContextualSpan; } });
Object.defineProperty(exports, "createContextualGeneration", { enumerable: true, get: function () { return context_1.createContextualGeneration; } });
Object.defineProperty(exports, "runWithTraceContext", { enumerable: true, get: function () { return context_1.runWithTraceContext; } });
// Langfuse initialization
var langfuse_1 = require("./lifecycle/langfuse");
Object.defineProperty(exports, "initLangfuse", { enumerable: true, get: function () { return langfuse_1.initializeLangfuse; } });
Object.defineProperty(exports, "getLangfuse", { enumerable: true, get: function () { return langfuse_1.getLangfuse; } });
Object.defineProperty(exports, "isLangfuseEnabled", { enumerable: true, get: function () { return langfuse_1.isLangfuseEnabled; } });
// ============================================
// GUARDRAILS
// ============================================
var guardrails_1 = require("./guardrails");
// Core guardrails
Object.defineProperty(exports, "lengthGuardrail", { enumerable: true, get: function () { return guardrails_1.lengthGuardrail; } });
Object.defineProperty(exports, "piiDetectionGuardrail", { enumerable: true, get: function () { return guardrails_1.piiDetectionGuardrail; } });
Object.defineProperty(exports, "customGuardrail", { enumerable: true, get: function () { return guardrails_1.customGuardrail; } });
// Advanced guardrails (optional)
Object.defineProperty(exports, "contentSafetyGuardrail", { enumerable: true, get: function () { return guardrails_1.contentSafetyGuardrail; } });
Object.defineProperty(exports, "topicRelevanceGuardrail", { enumerable: true, get: function () { return guardrails_1.topicRelevanceGuardrail; } });
Object.defineProperty(exports, "sentimentGuardrail", { enumerable: true, get: function () { return guardrails_1.sentimentGuardrail; } });
Object.defineProperty(exports, "toxicityGuardrail", { enumerable: true, get: function () { return guardrails_1.toxicityGuardrail; } });
Object.defineProperty(exports, "languageGuardrail", { enumerable: true, get: function () { return guardrails_1.languageGuardrail; } });
Object.defineProperty(exports, "rateLimitGuardrail", { enumerable: true, get: function () { return guardrails_1.rateLimitGuardrail; } });
// ============================================
// SESSION MANAGEMENT
// ============================================
var sessions_1 = require("./sessions");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return sessions_1.SessionManager; } });
Object.defineProperty(exports, "MemorySession", { enumerable: true, get: function () { return sessions_1.MemorySession; } });
// ============================================
// HELPERS & UTILITIES
// ============================================
// Message helpers
var message_1 = require("./helpers/message");
Object.defineProperty(exports, "user", { enumerable: true, get: function () { return message_1.user; } });
Object.defineProperty(exports, "assistant", { enumerable: true, get: function () { return message_1.assistant; } });
Object.defineProperty(exports, "system", { enumerable: true, get: function () { return message_1.system; } });
Object.defineProperty(exports, "toolMessage", { enumerable: true, get: function () { return message_1.toolMessage; } });
Object.defineProperty(exports, "getLastTextContent", { enumerable: true, get: function () { return message_1.getLastTextContent; } });
Object.defineProperty(exports, "filterMessagesByRole", { enumerable: true, get: function () { return message_1.filterMessagesByRole; } });
Object.defineProperty(exports, "extractAllText", { enumerable: true, get: function () { return message_1.extractAllText; } });
// Safe execution
var safe_execute_1 = require("./helpers/safe-execute");
Object.defineProperty(exports, "safeExecute", { enumerable: true, get: function () { return safe_execute_1.safeExecute; } });
// ============================================
// LIFECYCLE HOOKS
// ============================================
var lifecycle_1 = require("./lifecycle");
Object.defineProperty(exports, "AgentHooks", { enumerable: true, get: function () { return lifecycle_1.AgentHooks; } });
Object.defineProperty(exports, "RunHooks", { enumerable: true, get: function () { return lifecycle_1.RunHooks; } });
//# sourceMappingURL=index.js.map