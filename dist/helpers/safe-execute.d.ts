/**
 * Safe Execution Utilities
 *
 * Provides safe execution wrappers for tools and async operations.
 *
 * @module utils/safe-execute
 */
/**
 * Result of safe execution: [error, result]
 * If error is null, result contains the value.
 * If error is not null, result is null.
 */
export type SafeExecuteResult<T> = [Error | unknown | null, T | null];
/**
 * Safely execute an async function, catching any errors
 *
 * @param fn - The function to execute
 * @returns Tuple of [error, result]
 *
 * @example
 * ```typescript
 * const [error, result] = await safeExecute(() => tool.execute(args));
 * if (error) {
 *   console.error('Tool failed:', error);
 *   return handleError(error);
 * }
 * return result;
 * ```
 */
export declare function safeExecute<T>(fn: () => T | Promise<T>): Promise<SafeExecuteResult<T>>;
/**
 * Safe execute with timeout
 *
 * @param fn - The function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Tuple of [error, result]
 */
export declare function safeExecuteWithTimeout<T>(fn: () => T | Promise<T>, timeoutMs: number): Promise<SafeExecuteResult<T>>;
//# sourceMappingURL=safe-execute.d.ts.map