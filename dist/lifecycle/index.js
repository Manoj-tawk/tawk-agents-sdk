"use strict";
/**
 * Lifecycle Hooks and Event System
 *
 * @module lifecycle
 * @description
 * Event-driven lifecycle management for agents and runs.
 *
 * **Event Types**:
 * - **Agent Events**: agent_start, agent_end, agent_error
 * - **Run Events**: run_start, run_end, step_start, step_end, run_error
 *
 * **Features**:
 * - Type-safe event emitters
 * - Async event handler support
 * - Error propagation
 * - Composable hooks
 * - Zero runtime overhead when unused
 *
 * **Use Cases**:
 * - Custom logging and monitoring
 * - Performance tracking
 * - Custom metrics collection
 * - Integration with external systems
 * - Debug instrumentation
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunHooks = exports.AgentHooks = void 0;
const events_1 = require("events");
/**
 * Agent hooks - event emitter for agent lifecycle
 */
class AgentHooks extends events_1.EventEmitter {
    /**
     * Register a handler for agent_start event
     */
    onStart(handler) {
        return this.on('agent_start', handler);
    }
    /**
     * Register a handler for agent_end event
     */
    onEnd(handler) {
        return this.on('agent_end', handler);
    }
    /**
     * Register a handler for agent_handoff event
     */
    onHandoff(handler) {
        return this.on('agent_handoff', handler);
    }
    /**
     * Register a handler for agent_tool_start event
     */
    onToolStart(handler) {
        return this.on('agent_tool_start', handler);
    }
    /**
     * Register a handler for agent_tool_end event
     */
    onToolEnd(handler) {
        return this.on('agent_tool_end', handler);
    }
}
exports.AgentHooks = AgentHooks;
/**
 * Run hooks - event emitter for run lifecycle
 */
class RunHooks extends events_1.EventEmitter {
    /**
     * Register a handler for agent_start event
     */
    onAgentStart(handler) {
        return this.on('agent_start', handler);
    }
    /**
     * Register a handler for agent_end event
     */
    onAgentEnd(handler) {
        return this.on('agent_end', handler);
    }
    /**
     * Register a handler for agent_handoff event
     */
    onAgentHandoff(handler) {
        return this.on('agent_handoff', handler);
    }
    /**
     * Register a handler for agent_tool_start event
     */
    onToolStart(handler) {
        return this.on('agent_tool_start', handler);
    }
    /**
     * Register a handler for agent_tool_end event
     */
    onToolEnd(handler) {
        return this.on('agent_tool_end', handler);
    }
}
exports.RunHooks = RunHooks;
//# sourceMappingURL=index.js.map