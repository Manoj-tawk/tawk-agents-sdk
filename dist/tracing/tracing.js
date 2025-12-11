"use strict";
/**
 * Tracing Support for Langfuse Integration
 *
 * Provides hooks and helpers for integrating with Langfuse or other observability tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trace = exports.TraceManager = void 0;
exports.createLangfuseCallback = createLangfuseCallback;
exports.createConsoleCallback = createConsoleCallback;
exports.getGlobalTraceManager = getGlobalTraceManager;
exports.setGlobalTraceCallback = setGlobalTraceCallback;
const crypto_1 = require("crypto");
// ============================================
// TRACE MANAGER
// ============================================
class TraceManager {
    constructor() {
        this.activeTraces = new Map();
    }
    /**
     * Set a global trace callback
     */
    setGlobalCallback(callback) {
        this.globalCallback = callback;
    }
    /**
     * Start a new trace
     */
    startTrace(options = {}) {
        const traceId = options.traceId || this.generateTraceId();
        const trace = new Trace(traceId, options, this.globalCallback);
        this.activeTraces.set(traceId, trace);
        return trace;
    }
    /**
     * Get an active trace
     */
    getTrace(traceId) {
        return this.activeTraces.get(traceId);
    }
    /**
     * End a trace
     */
    endTrace(traceId) {
        const trace = this.activeTraces.get(traceId);
        if (trace) {
            trace.end();
            this.activeTraces.delete(traceId);
        }
    }
    /**
     * Clear all traces
     */
    clearAll() {
        for (const trace of this.activeTraces.values()) {
            trace.end();
        }
        this.activeTraces.clear();
    }
    generateTraceId() {
        return `trace_${(0, crypto_1.randomBytes)(16).toString('hex')}`;
    }
}
exports.TraceManager = TraceManager;
// ============================================
// TRACE CLASS
// ============================================
class Trace {
    constructor(id, options, callback) {
        this.id = id;
        this.options = options;
        this.events = [];
        this.startTime = Date.now();
        this.callback = callback || options.metadata?.callback;
        this.emit({
            type: 'agent-start',
            timestamp: this.startTime,
            data: {
                traceId: id,
                ...options,
            },
        });
    }
    /**
     * Log an agent step start
     */
    agentStepStart(agentName, stepNumber, messages) {
        this.emit({
            type: 'agent-start',
            timestamp: Date.now(),
            data: {
                agentName,
                stepNumber,
                messageCount: messages.length,
            },
        });
    }
    /**
     * Log an agent step end
     */
    agentStepEnd(step) {
        this.emit({
            type: 'agent-end',
            timestamp: Date.now(),
            data: step,
        });
    }
    /**
     * Log a tool execution start
     */
    toolStart(toolName, args) {
        this.emit({
            type: 'tool-start',
            timestamp: Date.now(),
            data: {
                toolName,
                args,
            },
        });
    }
    /**
     * Log a tool execution end
     */
    toolEnd(toolName, result, duration) {
        this.emit({
            type: 'tool-end',
            timestamp: Date.now(),
            data: {
                toolName,
                result,
                duration,
            },
        });
    }
    /**
     * Log a handoff
     */
    handoff(fromAgent, toAgent, reason) {
        this.emit({
            type: 'handoff',
            timestamp: Date.now(),
            data: {
                fromAgent,
                toAgent,
                reason,
            },
        });
    }
    /**
     * Log an error
     */
    error(error, context) {
        this.emit({
            type: 'error',
            timestamp: Date.now(),
            data: {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                context,
            },
        });
    }
    /**
     * Log a guardrail check
     */
    guardrail(name, passed, message) {
        this.emit({
            type: 'guardrail',
            timestamp: Date.now(),
            data: {
                name,
                passed,
                message,
            },
        });
    }
    /**
     * End the trace
     */
    end(metadata) {
        this.endTime = Date.now();
        this.emit({
            type: 'agent-end',
            timestamp: this.endTime,
            data: {
                traceId: this.id,
                duration: this.endTime - this.startTime,
                metadata,
                totalEvents: this.events.length,
            },
        });
    }
    /**
     * Get all events
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Get trace summary
     */
    getSummary() {
        const duration = (this.endTime || Date.now()) - this.startTime;
        const toolCalls = this.events.filter(e => e.type === 'tool-start').length;
        const handoffs = this.events.filter(e => e.type === 'handoff').length;
        const errors = this.events.filter(e => e.type === 'error').length;
        return {
            id: this.id,
            duration,
            eventCount: this.events.length,
            toolCalls,
            handoffs,
            errors,
        };
    }
    emit(event) {
        this.events.push(event);
        if (this.callback) {
            try {
                this.callback(event);
            }
            catch (error) {
                console.error('Trace callback error:', error);
            }
        }
    }
}
exports.Trace = Trace;
// ============================================
// LANGFUSE HELPER
// ============================================
/**
 * Create a Langfuse trace callback
 *
 * Example usage:
 * ```typescript
 * import { Langfuse } from 'langfuse';
 *
 * const langfuse = new Langfuse({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY,
 * });
 *
 * const callback = createLangfuseCallback(langfuse);
 * ```
 */
function createLangfuseCallback(langfuse) {
    return async (event) => {
        try {
            if (event.type === 'agent-start' && event.data.traceId) {
                // Start a new trace
                langfuse.trace({
                    id: event.data.traceId,
                    name: 'agent-run',
                    userId: event.data.userId,
                    sessionId: event.data.sessionId,
                    metadata: event.data.metadata,
                    tags: event.data.tags,
                });
            }
            else if (event.type === 'tool-start') {
                // Log tool execution
                langfuse.span({
                    name: `tool:${event.data.toolName}`,
                    input: event.data.args,
                    startTime: new Date(event.timestamp),
                });
            }
            else if (event.type === 'tool-end') {
                // End tool execution
                langfuse.span({
                    name: `tool:${event.data.toolName}`,
                    output: event.data.result,
                    endTime: new Date(event.timestamp),
                });
            }
            else if (event.type === 'error') {
                // Log error
                langfuse.event({
                    name: 'error',
                    metadata: event.data,
                    level: 'ERROR',
                });
            }
        }
        catch (error) {
            console.error('Langfuse callback error:', error);
        }
    };
}
/**
 * Create a simple console trace callback (for debugging)
 */
function createConsoleCallback(verbose = false) {
    return (event) => {
        const timestamp = new Date(event.timestamp).toISOString();
        if (verbose) {
            console.log(`[${timestamp}] ${event.type}:`, JSON.stringify(event.data, null, 2));
        }
        else {
            let summary = '';
            switch (event.type) {
                case 'agent-start':
                    summary = `Agent: ${event.data.agentName}`;
                    break;
                case 'tool-start':
                    summary = `Tool: ${event.data.toolName}`;
                    break;
                case 'handoff':
                    summary = `${event.data.fromAgent} → ${event.data.toAgent}`;
                    break;
                case 'error':
                    summary = event.data.error?.message || 'Unknown error';
                    break;
                default:
                    summary = '';
            }
            console.log(`[${timestamp}] ${event.type}: ${summary}`);
        }
    };
}
// ============================================
// GLOBAL TRACE MANAGER
// ============================================
let globalTraceManager = null;
function getGlobalTraceManager() {
    if (!globalTraceManager) {
        globalTraceManager = new TraceManager();
    }
    return globalTraceManager;
}
function setGlobalTraceCallback(callback) {
    getGlobalTraceManager().setGlobalCallback(callback);
}
//# sourceMappingURL=tracing.js.map