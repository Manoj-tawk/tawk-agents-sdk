"use strict";
/**
 * Handoff Extensions
 *
 * Pre-built handoff filters and utilities for multi-agent workflows.
 *
 * @module extensions/handoff
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAllTools = removeAllTools;
exports.keepLastMessages = keepLastMessages;
exports.keepLastMessage = keepLastMessage;
exports.keepMessagesOnly = keepMessagesOnly;
exports.createHandoffPrompt = createHandoffPrompt;
/**
 * Remove all tools from handoff input
 * Useful when you don't want the next agent to see previous tool calls
 */
function removeAllTools(input) {
    const filteredHistory = Array.isArray(input.inputHistory)
        ? input.inputHistory.filter((msg) => msg.role !== 'tool')
        : input.inputHistory;
    const filteredPreItems = input.preHandoffItems.filter((item) => item.type !== 'tool_call' && item.type !== 'tool_result');
    const filteredNewItems = input.newItems.filter((item) => item.type !== 'tool_call' && item.type !== 'tool_result');
    return {
        inputHistory: filteredHistory,
        preHandoffItems: filteredPreItems,
        newItems: filteredNewItems,
        runContext: input.runContext,
    };
}
/**
 * Keep only the last N messages
 */
function keepLastMessages(limit) {
    return (input) => {
        const historyArray = Array.isArray(input.inputHistory)
            ? input.inputHistory
            : [{ role: 'user', content: input.inputHistory }];
        const kept = historyArray.slice(-limit);
        return {
            inputHistory: kept,
            preHandoffItems: input.preHandoffItems.slice(-limit),
            newItems: input.newItems.slice(-limit),
            runContext: input.runContext,
        };
    };
}
/**
 * Keep only the last message
 */
function keepLastMessage() {
    return keepLastMessages(1);
}
/**
 * Keep only messages (remove all items)
 */
function keepMessagesOnly(input) {
    return {
        inputHistory: input.inputHistory,
        preHandoffItems: [],
        newItems: [],
        runContext: input.runContext,
    };
}
/**
 * Create a handoff prompt describing available handoffs
 */
function createHandoffPrompt(agents) {
    if (agents.length === 0) {
        return '';
    }
    const descriptions = agents
        .map(agent => {
        const desc = agent.handoffDescription || 'No description available';
        return `- ${agent.name}: ${desc}`;
    })
        .join('\n');
    return `Available specialists to handoff to:\n${descriptions}`;
}
//# sourceMappingURL=filters.js.map