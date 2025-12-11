/**
 * Tracing Utilities
 *
 * Wrapper functions for tracing tool execution and handoffs.
 *
 * @module tracing-utils
 */
/**
 * Wrap a function execution with a tracing span
 */
export declare function withFunctionSpan<T>(trace: any, name: string, input: any, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
/**
 * Wrap a handoff with a tracing span
 */
export declare function withHandoffSpan<T>(trace: any, fromAgent: string, toAgent: string, reason: string, fn: () => Promise<T>): Promise<T>;
/**
 * Wrap a guardrail check with a tracing span
 */
export declare function withGuardrailSpan<T>(trace: any, guardrailName: string, input: any, fn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=tracing-utils.d.ts.map