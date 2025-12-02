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
  
  // Types
  type AgentConfig,
  type CoreTool,
  type RunContextWrapper,
  type RunOptions,
  type RunResult,
  type StreamResult,
} from './core/agent';

// Runner with enhanced streaming
export { AgenticRunner, type StreamEvent } from './core/runner';

// Race agents pattern for parallel execution
export { raceAgents } from './core/race-agents';
export type { RaceAgentsOptions } from './core/race-agents';

// Usage tracking
export { Usage } from './core/usage';

// Transfers (formerly handoffs) system
export { 
  createTransferTools, 
  detectTransfer, 
  createTransferContext,
} from './core/transfers';
export type { TransferResult } from './core/transfers';

// Tracing context
export {
  withTrace,
  getCurrentTrace,
  getCurrentSpan,
  setCurrentSpan,
  createContextualSpan,
  createContextualGeneration,
  runWithTraceContext,
} from './tracing/context';

// ============================================
// EVENTS & LIFECYCLE
// ============================================

// Events
export {
  RunRawModelStreamEvent,
  RunItemStreamEvent,
  RunAgentUpdatedStreamEvent,
} from './lifecycle/events';
export type { RunItemStreamEventName, RunStreamEvent } from './lifecycle/events';

// Lifecycle hooks
export { AgentHooks, RunHooks } from './lifecycle';
export type { AgentHookEvents, RunHookEvents } from './lifecycle';

// Utilities
export { safeExecute, safeExecuteWithTimeout } from './helpers/safe-execute';
export type { SafeExecuteResult } from './helpers/safe-execute';

// Message helpers
export { user, assistant, system, toolMessage, getLastTextContent, filterMessagesByRole, extractAllText } from './helpers/message';

// TOON format helpers (for efficient LLM token usage)
export { 
  encodeTOON, 
  decodeTOON, 
  formatToolResultTOON, 
  formatToolResultsBatch,
  isTOONFormat,
  smartDecode,
  calculateTokenSavings
} from './helpers/toon';

// Type utilities
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

// Run state management
export { RunState } from './core/runstate';
export type {
  RunItem,
  RunItemType,
  RunMessageItem,
  RunToolCallItem,
  RunToolResultItem,
  ModelResponse,
} from './core/runstate';

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
// TRACING
// ============================================

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
// ERROR TYPES
// ============================================

export {
  MaxTurnsExceededError,
  GuardrailTripwireTriggered,
  ToolExecutionError,
  HandoffError,
  ApprovalRequiredError,
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
