/**
 * Events System
 *
 * Streaming events for agent runs and lifecycle management.
 *
 * @module events
 */
import type { Agent } from '../core/agent';
import type { RunItem } from '../core/runstate';
/**
 * Streaming event from the LLM (raw events passed through)
 */
export declare class RunRawModelStreamEvent {
    data: any;
    readonly type = "raw_model_stream_event";
    constructor(data: any);
}
/**
 * Names of run item stream events
 */
export type RunItemStreamEventName = 'message_output_created' | 'handoff_requested' | 'handoff_occurred' | 'tool_called' | 'tool_output' | 'reasoning_item_created';
/**
 * Streaming events that wrap a RunItem
 */
export declare class RunItemStreamEvent {
    name: RunItemStreamEventName;
    item: RunItem;
    readonly type = "run_item_stream_event";
    constructor(name: RunItemStreamEventName, item: RunItem);
}
/**
 * Event that notifies that there is a new agent running
 */
export declare class RunAgentUpdatedStreamEvent {
    agent: Agent<any, any>;
    readonly type = "agent_updated_stream_event";
    constructor(agent: Agent<any, any>);
}
/**
 * Union of all streaming event types
 */
export type RunStreamEvent = RunRawModelStreamEvent | RunItemStreamEvent | RunAgentUpdatedStreamEvent;
//# sourceMappingURL=events.d.ts.map