"use strict";
/**
 * Safe Execution Utilities
 *
 * Provides safe execution wrappers for tools and async operations.
 *
 * @module utils/safe-execute
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeExecute = safeExecute;
exports.safeExecuteWithTimeout = safeExecuteWithTimeout;
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
async function safeExecute(fn) {
    try {
        const result = await fn();
        return [null, result];
    }
    catch (error) {
        return [error, null];
    }
}
/**
 * Safe execute with timeout
 *
 * @param fn - The function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Tuple of [error, result]
 */
async function safeExecuteWithTimeout(fn, timeoutMs) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve([new Error(`Execution timeout after ${timeoutMs}ms`), null]);
        }, timeoutMs);
        safeExecute(fn).then((result) => {
            clearTimeout(timer);
            resolve(result);
        });
    });
}
//# sourceMappingURL=safe-execute.js.map