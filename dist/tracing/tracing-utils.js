"use strict";
/**
 * Tracing Utilities
 *
 * Wrapper functions for tracing tool execution and handoffs.
 *
 * @module tracing-utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withFunctionSpan = withFunctionSpan;
exports.withHandoffSpan = withHandoffSpan;
exports.withGuardrailSpan = withGuardrailSpan;
const langfuse_1 = require("../lifecycle/langfuse");
/**
 * Wrap a function execution with a tracing span
 */
async function withFunctionSpan(trace, name, input, fn, metadata) {
    if (!trace) {
        return await fn();
    }
    const span = (0, langfuse_1.createSpan)(trace, {
        name: `Tool: ${name}`,
        input,
        metadata: {
            ...metadata,
            toolName: name,
            type: 'function',
        },
    });
    try {
        const result = await fn();
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: result,
                level: 'DEFAULT',
            });
        }
        return result;
    }
    catch (error) {
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: { error: error instanceof Error ? error.message : String(error) },
                level: 'ERROR',
                statusMessage: 'Tool execution failed',
            });
        }
        throw error;
    }
}
/**
 * Wrap a handoff with a tracing span
 */
async function withHandoffSpan(trace, fromAgent, toAgent, reason, fn) {
    if (!trace) {
        return await fn();
    }
    const span = (0, langfuse_1.createSpan)(trace, {
        name: `Handoff: ${fromAgent} → ${toAgent}`,
        input: {
            from: fromAgent,
            to: toAgent,
            reason,
        },
        metadata: {
            type: 'handoff',
            fromAgent,
            toAgent,
            handoffReason: reason,
        },
    });
    try {
        const result = await fn();
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: { success: true, result },
                level: 'DEFAULT',
            });
        }
        return result;
    }
    catch (error) {
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: { error: error instanceof Error ? error.message : String(error) },
                level: 'ERROR',
                statusMessage: 'Handoff failed',
            });
        }
        throw error;
    }
}
/**
 * Wrap a guardrail check with a tracing span
 */
async function withGuardrailSpan(trace, guardrailName, input, fn) {
    if (!trace) {
        return await fn();
    }
    const span = (0, langfuse_1.createSpan)(trace, {
        name: `Guardrail: ${guardrailName}`,
        input,
        metadata: {
            type: 'guardrail',
            guardrailName,
        },
    });
    try {
        const result = await fn();
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: result,
                level: 'DEFAULT',
            });
        }
        return result;
    }
    catch (error) {
        if (span) {
            (0, langfuse_1.endSpan)(span, {
                output: { error: error instanceof Error ? error.message : String(error) },
                level: 'ERROR',
                statusMessage: 'Guardrail failed',
            });
        }
        throw error;
    }
}
//# sourceMappingURL=tracing-utils.js.map