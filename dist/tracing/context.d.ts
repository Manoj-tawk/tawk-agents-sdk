/**
 * Tracing Context Management
 *
 * @module tracing/context
 * @description
 * Context propagation for hierarchical distributed tracing.
 *
 * **Features**:
 * - AsyncLocalStorage-based context isolation
 * - Automatic trace propagation across async boundaries
 * - Thread-safe context management
 * - Support for nested spans and generations
 * - Zero-overhead when tracing is disabled
 *
 * **Architecture**:
 * Uses Node.js AsyncLocalStorage to maintain trace context
 * throughout the execution lifecycle without explicit parameter
 * passing. This enables clean, maintainable code while providing
 * comprehensive observability.
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
/**
 * Get the current trace from context
 */
export declare function getCurrentTrace(): any | null;
/**
 * Get the current span from context
 */
export declare function getCurrentSpan(): any | null;
/**
 * Set the current span in context
 */
export declare function setCurrentSpan(span: any): void;
/**
 * Wrap code in a trace context
 *
 * This is the KEY function - it creates ONE trace for the entire workflow
 */
export declare function withTrace<T>(name: string, fn: (trace: any) => Promise<T>, options?: {
    input?: any;
    metadata?: Record<string, any>;
    tags?: string[];
    sessionId?: string;
    userId?: string;
}): Promise<T>;
/**
 * Create a span in the current context
 *
 * Automatically nests under current span or trace
 */
export declare function createContextualSpan(name: string, options?: {
    metadata?: Record<string, any>;
    input?: any;
}): any;
/**
 * Run function within trace context
 * This ensures all spans created inside are nested under the trace
 */
export declare function runWithTraceContext<T>(trace: any, fn: () => Promise<T>): Promise<T>;
/**
 * Create a generation in the current context
 *
 * Automatically nests under current span or trace
 */
export declare function createContextualGeneration(name: string, options?: {
    model?: string;
    input?: any;
    metadata?: Record<string, any>;
}): any;
//# sourceMappingURL=context.d.ts.map