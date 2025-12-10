"use strict";
/**
 * Enhanced Types for Full Feature Support
 *
 * Includes: Error types, Background results, Tracing, MCP, Human-in-the-loop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalRequiredError = exports.HandoffError = exports.ToolExecutionError = exports.GuardrailTripwireTriggered = exports.MaxTurnsExceededError = exports.BackgroundResult = void 0;
exports.backgroundResult = backgroundResult;
exports.isBackgroundResult = isBackgroundResult;
// ============================================
// BACKGROUND RESULT SUPPORT
// ============================================
/**
 * Background result - tool execution that continues in background
 * Useful for long-running operations that don't block agent flow
 */
class BackgroundResult {
    constructor(promise) {
        this.promise = promise;
        this.isBackground = true;
    }
}
exports.BackgroundResult = BackgroundResult;
function backgroundResult(promise) {
    return new BackgroundResult(promise);
}
function isBackgroundResult(value) {
    return value && typeof value === 'object' && value.isBackground === true;
}
// ============================================
// ERROR TYPES
// ============================================
class MaxTurnsExceededError extends Error {
    constructor(maxTurns) {
        super(`Maximum number of turns (${maxTurns}) exceeded`);
        this.name = 'MaxTurnsExceededError';
    }
}
exports.MaxTurnsExceededError = MaxTurnsExceededError;
class GuardrailTripwireTriggered extends Error {
    constructor(guardrailName, message, metadata) {
        super(message);
        this.guardrailName = guardrailName;
        this.metadata = metadata;
        this.name = 'GuardrailTripwireTriggered';
    }
}
exports.GuardrailTripwireTriggered = GuardrailTripwireTriggered;
class ToolExecutionError extends Error {
    constructor(toolName, message, originalError) {
        super(message);
        this.toolName = toolName;
        this.originalError = originalError;
        this.name = 'ToolExecutionError';
    }
}
exports.ToolExecutionError = ToolExecutionError;
class HandoffError extends Error {
    constructor(fromAgent, toAgent, message, originalError) {
        super(message);
        this.fromAgent = fromAgent;
        this.toAgent = toAgent;
        this.originalError = originalError;
        this.name = 'HandoffError';
    }
}
exports.HandoffError = HandoffError;
class ApprovalRequiredError extends Error {
    constructor(toolName, args, approvalToken) {
        super(`Approval required for tool: ${toolName}`);
        this.toolName = toolName;
        this.args = args;
        this.approvalToken = approvalToken;
        this.name = 'ApprovalRequiredError';
    }
}
exports.ApprovalRequiredError = ApprovalRequiredError;
//# sourceMappingURL=types.js.map