"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentTrace = getCurrentTrace;
exports.getCurrentSpan = getCurrentSpan;
exports.setCurrentSpan = setCurrentSpan;
exports.withTrace = withTrace;
exports.createContextualSpan = createContextualSpan;
exports.runWithTraceContext = runWithTraceContext;
exports.createContextualGeneration = createContextualGeneration;
const async_hooks_1 = require("async_hooks");
const traceStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Get the current trace from context
 */
function getCurrentTrace() {
    const context = traceStorage.getStore();
    return context?.trace || null;
}
/**
 * Get the current span from context
 */
function getCurrentSpan() {
    const context = traceStorage.getStore();
    return context?.span || null;
}
/**
 * Set the current span in context
 */
function setCurrentSpan(span) {
    const context = traceStorage.getStore();
    if (context) {
        context.span = span;
    }
}
/**
 * Wrap code in a trace context
 *
 * This is the KEY function - it creates ONE trace for the entire workflow
 */
async function withTrace(name, fn, options = {}) {
    // Check if we already have a trace (nested call)
    const existingTrace = getCurrentTrace();
    if (existingTrace) {
        // Already in a trace, just execute
        return await fn(existingTrace);
    }
    // Import here to avoid circular dependency
    const { createTrace } = await Promise.resolve().then(() => __importStar(require('../lifecycle/langfuse')));
    // Create new trace with input
    const trace = createTrace({
        name,
        input: options.input, // Forward input to trace
        metadata: options.metadata,
        tags: options.tags,
        sessionId: options.sessionId,
        userId: options.userId,
    });
    if (!trace) {
        // Langfuse not enabled, just execute without tracing
        return await fn(null);
    }
    // Run function with trace in context
    // Capture output when function completes
    let result;
    let output = null;
    try {
        result = await traceStorage.run({ trace, span: null }, async () => {
            return await fn(trace);
        });
        // Extract output from result if it's a RunResult
        if (result && typeof result === 'object' && 'finalOutput' in result) {
            output = {
                finalOutput: result.finalOutput,
                stepCount: result.steps?.length || 0,
                totalToolCalls: result.metadata?.totalToolCalls || 0,
                totalTransfers: result.metadata?.totalTransfers || 0,
                handoffChain: result.metadata?.handoffChain,
                finishReason: result.metadata?.finishReason,
            };
        }
        else {
            output = result;
        }
        return result;
    }
    finally {
        // Update trace with output when function completes
        if (trace && output !== null) {
            try {
                trace.update({
                    output,
                    metadata: {
                        ...options.metadata,
                        completed: true,
                    },
                });
            }
            catch (error) {
                // Don't fail if trace update fails
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to update trace output in withTrace:', error);
                }
            }
        }
    }
}
/**
 * Create a span in the current context
 *
 * Automatically nests under current span or trace
 */
function createContextualSpan(name, options = {}) {
    const context = traceStorage.getStore();
    if (!context) {
        return null;
    }
    // Create span under current span or trace
    const parent = context.span || context.trace;
    if (!parent) {
        return null;
    }
    const span = parent.span({
        name,
        metadata: options.metadata,
        input: options.input,
    });
    return span;
}
/**
 * Run function within trace context
 * This ensures all spans created inside are nested under the trace
 */
async function runWithTraceContext(trace, fn) {
    if (!trace) {
        return await fn();
    }
    return await traceStorage.run({ trace, span: null }, fn);
}
/**
 * Create a generation in the current context
 *
 * Automatically nests under current span or trace
 */
function createContextualGeneration(name, options = {}) {
    const context = traceStorage.getStore();
    if (!context) {
        return null;
    }
    // Create generation under current span or trace
    const parent = context.span || context.trace;
    if (!parent) {
        return null;
    }
    const generation = parent.generation({
        name,
        model: options.model,
        input: options.input,
        metadata: options.metadata,
    });
    return generation;
}
//# sourceMappingURL=context.js.map