"use strict";
/**
 * Events System
 *
 * Streaming events for agent runs and lifecycle management.
 *
 * @module events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunAgentUpdatedStreamEvent = exports.RunItemStreamEvent = exports.RunRawModelStreamEvent = void 0;
/**
 * Streaming event from the LLM (raw events passed through)
 */
class RunRawModelStreamEvent {
    constructor(data) {
        this.data = data;
        this.type = 'raw_model_stream_event';
    }
}
exports.RunRawModelStreamEvent = RunRawModelStreamEvent;
/**
 * Streaming events that wrap a RunItem
 */
class RunItemStreamEvent {
    constructor(name, item) {
        this.name = name;
        this.item = item;
        this.type = 'run_item_stream_event';
    }
}
exports.RunItemStreamEvent = RunItemStreamEvent;
/**
 * Event that notifies that there is a new agent running
 */
class RunAgentUpdatedStreamEvent {
    constructor(agent) {
        this.agent = agent;
        this.type = 'agent_updated_stream_event';
    }
}
exports.RunAgentUpdatedStreamEvent = RunAgentUpdatedStreamEvent;
//# sourceMappingURL=events.js.map