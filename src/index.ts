/**
 * Tawk Agents SDK - Core
 * 
 * Production-ready AI agent framework built on Vercel AI SDK.
 * Flexible, multi-provider support with comprehensive features.
 * 
 * @packageDocumentation
 * @module tawk-agents-sdk
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */

// ============================================
// CORE EXPORTS
// ============================================

export {
  // Agent class
  Agent,
  
  // Run functions
  run,
  runStream,
  
  // Tool function
  tool,
  
  // Utilities
  setDefaultModel,
} from './core/agent';

// Dynamic HITL Approvals
export {
  ApprovalManager as DynamicApprovalManager,
  ApprovalPolicies,
  toolWithApproval,
  formatApprovalRequest,
} from './core/approvals';
export type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalFunction,
} from './core/approvals';

// Enhanced MCP (Native agent-level integration)
export {
  EnhancedMCPServer,
  EnhancedMCPServerManager,
} from './mcp/enhanced';
export type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
} from './mcp/enhanced';

// Race agents pattern for parallel execution
export { raceAgents } from './core/race-agents';
export type { RaceAgentsOptions } from './core/race-agents';

// Usage tracking
export { Usage } from './core/usage';

// Tracing utilities (for custom tracing)
export { withFunctionSpan, withHandoffSpan, withGuardrailSpan } from './tracing/tracing-utils';

// Tracing context (advanced tracing control)
export { withTrace, getCurrentTrace, getCurrentSpan, setCurrentSpan, createContextualSpan, createContextualGeneration } from './tracing/context';

// ============================================
// EVENTS & LIFECYCLE
// ============================================

// Events (for streaming event types)
export {
  RunRawModelStreamEvent,
  RunItemStreamEvent,
  RunAgentUpdatedStreamEvent,
} from './lifecycle/events';
export type { RunItemStreamEventName, RunStreamEvent } from './lifecycle/events';

// Lifecycle hooks (for custom event handling)
export { AgentHooks, RunHooks } from './lifecycle';
export type { AgentHookEvents, RunHookEvents } from './lifecycle';

// Utilities for error-safe execution
export { safeExecute, safeExecuteWithTimeout } from './helpers/safe-execute';
export type { SafeExecuteResult } from './helpers/safe-execute';

// Message helpers for building conversations
export { user, assistant, system, toolMessage, getLastTextContent, filterMessagesByRole, extractAllText } from './helpers/message';

// TOON format helpers (42% token reduction)
export { 
  encodeTOON, 
  decodeTOON, 
  formatToolResultTOON, 
  formatToolResultsBatch,
  isTOONFormat,
  smartDecode,
  calculateTokenSavings
} from './helpers/toon';

// TypeScript utility types (for advanced type manipulation)
export type {
  Expand,
  DeepPartial,
  SnakeToCamelCase,
  RequireKeys,
  OptionalKeys,
  KeysOfType,
  Prettify,
  Mutable,
  UnwrapPromise,
  ArrayElement,
} from './types/helpers';

// Run state management (for interruption/resumption patterns)
export { RunState } from './core/runstate';
export type {
  RunItem,
  RunItemType,
  RunMessageItem,
  RunToolCallItem,
  RunToolResultItem,
  RunHandoffCallItem,
  RunHandoffOutputItem,
  RunGuardrailItem,
  ModelResponse,
} from './core/runstate';

// Types from agent
export type {
  AgentConfig,
  AgentMetric,
  RunOptions,
  RunResult,
  StreamResult,
  Session,
  StepResult,
  RunContextWrapper,
} from './core/agent';

// ============================================
// SESSION MANAGEMENT
// ============================================

export {
  SessionManager,
  MemorySession,
  RedisSession,
  DatabaseSession,
  HybridSession,
} from './sessions';

// ============================================
// GUARDRAILS
// ============================================

export {
  guardrails,
  piiDetectionGuardrail,
  lengthGuardrail,
  contentSafetyGuardrail,
  topicRelevanceGuardrail,
  formatValidationGuardrail,
  customGuardrail,
  rateLimitGuardrail,
  languageGuardrail,
  sentimentGuardrail,
  toxicityGuardrail,
} from './guardrails';

export type {
  Guardrail,
  GuardrailResult,
} from './core/agent';

// ============================================
// MCP (Model Context Protocol)
// ============================================

export {
  MCPServerManager,
  getGlobalMCPManager,
  registerMCPServer,
  getMCPTools,
  shutdownMCPServers,
} from './mcp';

// MCP utilities
export {
  filterMCPTools,
  createMCPToolStaticFilter,
  mcpToFunctionTool,
  normalizeMCPToolName,
  groupMCPToolsByServer,
} from './mcp/utils';
export type { MCPToolFilter } from './mcp/utils';

// ============================================
// HUMAN-IN-THE-LOOP (Approvals)
// ============================================

export {
  ApprovalManager,
  getGlobalApprovalManager,
  createCLIApprovalHandler,
  createWebhookApprovalHandler,
  createAutoApproveHandler,
  createAutoRejectHandler,
} from './approvals';

// ============================================
// TRACING (Advanced - use Langfuse for most cases)
// ============================================

// Note: Most users should use the Langfuse integration below.
// These exports are for advanced custom tracing implementations.
export {
  TraceManager,
  getGlobalTraceManager,
  setGlobalTraceCallback,
  createLangfuseCallback,
  createConsoleCallback,
} from './tracing/tracing';

export type {
  Trace,
} from './tracing/tracing';

// ============================================
// LANGFUSE INTEGRATION
// ============================================

export {
  initializeLangfuse,
  getLangfuse,
  isLangfuseEnabled,
  createTrace,
  createGeneration,
  updateGeneration,
  endGeneration,
  createSpan,
  endSpan,
  score,
  flushLangfuse,
  shutdownLangfuse,
} from './lifecycle/langfuse';

// ============================================
// ERROR TYPES & ASYNC PATTERNS
// ============================================

export {
  MaxTurnsExceededError,
  GuardrailTripwireTriggered,
  ToolExecutionError,
  HandoffError,
  ApprovalRequiredError,
  // Background result pattern for async execution
  backgroundResult,
  isBackgroundResult,
} from './types/types';

export type {
  BackgroundResult,
} from './types/types';

// ============================================
// AI TOOLS (Image, Audio, Embeddings, Reranking)
// ============================================

export {
  // Image Generation
  generateImageAI,
  createImageGenerationTool,
  
  // Audio Transcription
  transcribeAudioAI,
  createTranscriptionTool,
  
  // Text-to-Speech
  generateSpeechAI,
  createTextToSpeechTool,
  
  // Embeddings
  generateEmbeddingAI,
  generateEmbeddingsAI,
  cosineSimilarity,
  createEmbeddingTool,
  
  // Reranking
  rerankDocuments,
  createRerankTool,
} from './tools';

export type {
  // Image types
  GenerateImageOptions,
  GenerateImageResult,
  
  // Audio types
  TranscribeAudioOptions,
  TranscribeAudioResult,
  GenerateSpeechOptions,
  GenerateSpeechResult,
  
  // Embedding types
  GenerateEmbeddingOptions,
  GenerateEmbeddingsOptions,
  EmbeddingResult,
  EmbeddingsResult,
  
  // Reranking types
  RerankOptions,
  RerankResult,
} from './tools';

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Default export for convenience
 */
export { Agent as default } from './core/agent';
