"use strict";
/**
 * Handoff System
 *
 * Implements structured agent-to-agent handoffs for multi-agent workflows.
 * Handoffs allow one agent to delegate tasks to another specialized agent.
 *
 * @module handoff
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handoff = void 0;
exports.handoff = handoff;
exports.getHandoff = getHandoff;
/**
 * Handoff class - represents delegation from one agent to another
 */
class Handoff {
    constructor(agent, onInvokeHandoff) {
        this.agent = agent;
        this.agentName = agent.name;
        this.onInvokeHandoff = onInvokeHandoff;
        // Default tool name: transfer_to_agent_name
        this.toolName = `transfer_to_${agent.name.toLowerCase().replace(/\s+/g, '_')}`;
        // Default description
        this.toolDescription = `Handoff to the ${agent.name} agent to handle the request. ${agent.handoffDescription ?? ''}`;
        // Default: always enabled
        this.isEnabled = async () => true;
    }
    /**
     * Get transfer message for tool output
     */
    getTransferMessage() {
        return JSON.stringify({ assistant: this.agentName });
    }
}
exports.Handoff = Handoff;
/**
 * Create a handoff from an agent
 */
function handoff(agent, config = {}) {
    const handoffInstance = new Handoff(agent, async () => agent);
    if (config.toolNameOverride) {
        handoffInstance.toolName = config.toolNameOverride;
    }
    if (config.toolDescriptionOverride) {
        handoffInstance.toolDescription = config.toolDescriptionOverride;
    }
    if (config.inputFilter) {
        handoffInstance.inputFilter = config.inputFilter;
    }
    if (typeof config.isEnabled === 'function') {
        handoffInstance.isEnabled = config.isEnabled;
    }
    else if (typeof config.isEnabled === 'boolean') {
        handoffInstance.isEnabled = async () => config.isEnabled;
    }
    return handoffInstance;
}
/**
 * Get handoff from agent or handoff instance
 */
function getHandoff(agent) {
    if (agent instanceof Handoff) {
        return agent;
    }
    return handoff(agent);
}
//# sourceMappingURL=index.js.map