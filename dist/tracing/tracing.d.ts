/**
 * Tracing Support for Langfuse Integration
 *
 * Provides hooks and helpers for integrating with Langfuse or other observability tools
 */
import type { TraceEvent, TraceCallback, TraceOptions, StepResult, RunMetadata } from '../types/types';
export declare class TraceManager {
    private activeTraces;
    private globalCallback?;
    /**
     * Set a global trace callback
     */
    setGlobalCallback(callback: TraceCallback): void;
    /**
     * Start a new trace
     */
    startTrace(options?: TraceOptions): Trace;
    /**
     * Get an active trace
     */
    getTrace(traceId: string): Trace | undefined;
    /**
     * End a trace
     */
    endTrace(traceId: string): void;
    /**
     * Clear all traces
     */
    clearAll(): void;
    private generateTraceId;
}
export declare class Trace {
    readonly id: string;
    readonly options: TraceOptions;
    private events;
    private startTime;
    private endTime?;
    private callback?;
    constructor(id: string, options: TraceOptions, callback?: TraceCallback);
    /**
     * Log an agent step start
     */
    agentStepStart(agentName: string, stepNumber: number, messages: any[]): void;
    /**
     * Log an agent step end
     */
    agentStepEnd(step: StepResult): void;
    /**
     * Log a tool execution start
     */
    toolStart(toolName: string, args: any): void;
    /**
     * Log a tool execution end
     */
    toolEnd(toolName: string, result: any, duration?: number): void;
    /**
     * Log a handoff
     */
    handoff(fromAgent: string, toAgent: string, reason?: string): void;
    /**
     * Log an error
     */
    error(error: Error, context?: any): void;
    /**
     * Log a guardrail check
     */
    guardrail(name: string, passed: boolean, message?: string): void;
    /**
     * End the trace
     */
    end(metadata?: RunMetadata): void;
    /**
     * Get all events
     */
    getEvents(): TraceEvent[];
    /**
     * Get trace summary
     */
    getSummary(): {
        id: string;
        duration: number;
        eventCount: number;
        toolCalls: number;
        handoffs: number;
        errors: number;
    };
    private emit;
}
/**
 * Create a Langfuse trace callback
 *
 * Example usage:
 * ```typescript
 * import { Langfuse } from 'langfuse';
 *
 * const langfuse = new Langfuse({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY,
 * });
 *
 * const callback = createLangfuseCallback(langfuse);
 * ```
 */
export declare function createLangfuseCallback(langfuse: any): TraceCallback;
/**
 * Create a simple console trace callback (for debugging)
 */
export declare function createConsoleCallback(verbose?: boolean): TraceCallback;
export declare function getGlobalTraceManager(): TraceManager;
export declare function setGlobalTraceCallback(callback: TraceCallback): void;
//# sourceMappingURL=tracing.d.ts.map