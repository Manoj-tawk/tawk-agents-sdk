/**
 * Langfuse Tracing Integration
 *
 * @module lifecycle/langfuse
 * @description
 * Enterprise-grade observability and tracing for AI agents.
 *
 * **Features**:
 * - End-to-end trace visualization
 * - Agent execution tracking
 * - Tool call monitoring
 * - LLM generation tracing
 * - Guardrail execution tracking
 * - Token usage analytics
 * - Cost tracking
 * - Performance metrics
 *
 * **Trace Hierarchy**:
 * ```
 * Trace (Agent Run)
 * ├── Agent Span (Coordinator)
 * │   ├── Generation (LLM Call)
 * │   └── Tool Span (Tool Execution)
 * └── Agent Span (Specialist)
 *     ├── Guardrail Span (Input Validation)
 *     ├── Generation (LLM Call)
 *     └── Guardrail Span (Output Validation)
 * ```
 *
 * @see {@link https://langfuse.com Langfuse Documentation}
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
import { Langfuse } from 'langfuse';
import type { ModelMessage } from 'ai';
/**
 * Initialize Langfuse with credentials from environment variables
 */
export declare function initializeLangfuse(): Langfuse | null;
/**
 * Get the current Langfuse instance (initializes if needed)
 */
export declare function getLangfuse(): Langfuse | null;
/**
 * Check if Langfuse tracing is enabled
 * Auto-initializes Langfuse if credentials are available
 */
export declare function isLangfuseEnabled(): boolean;
/**
 * Create a trace for an agent run
 */
export declare function createTrace(options: {
    name: string;
    userId?: string;
    sessionId?: string;
    input?: any;
    output?: any;
    metadata?: Record<string, any>;
    tags?: string[];
}): import("langfuse-core").LangfuseTraceClient | null;
/**
 * Create a generation span within a trace
 */
export declare function createGeneration(trace: any, options: {
    name: string;
    model?: string;
    modelParameters?: Record<string, any>;
    input?: any;
    metadata?: Record<string, any>;
}): any;
/**
 * Update a generation with output and usage data
 */
export declare function updateGeneration(generation: any, options: {
    output?: any;
    usage?: {
        input?: number;
        output?: number;
        total?: number;
    };
    metadata?: Record<string, any>;
}): void;
/**
 * End a generation with completion status
 */
export declare function endGeneration(generation: any, options?: {
    output?: any;
    level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
    statusMessage?: string;
}): void;
/**
 * Create a span for tool execution
 */
export declare function createSpan(trace: any, options: {
    name: string;
    input?: any;
    metadata?: Record<string, any>;
}): any;
/**
 * End a span with output data
 */
export declare function endSpan(span: any, options?: {
    output?: any;
    level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
    statusMessage?: string;
}): void;
/**
 * Score a trace or generation
 */
export declare function score(options: {
    traceId?: string;
    observationId?: string;
    name: string;
    value: number;
    comment?: string;
}): void;
/**
 * Flush all pending traces to Langfuse
 */
export declare function flushLangfuse(): Promise<void>;
/**
 * Shutdown Langfuse and flush all pending traces
 */
export declare function shutdownLangfuse(): Promise<void>;
/**
 * Helper to format messages for Langfuse
 */
export declare function formatMessagesForLangfuse(messages: ModelMessage[]): any[];
/**
 * Helper to extract model name from model config
 */
export declare function extractModelName(model: any): string;
//# sourceMappingURL=index.d.ts.map