"use strict";
/**
 * Result Types - Enhanced RunResult
 *
 * Provides rich result types with history, output, metadata, and more.
 *
 * @module result
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamedRunResult = exports.RunResult = void 0;
/**
 * Enhanced RunResult with additional properties
 */
class RunResult {
    constructor(state) {
        this.state = state;
    }
    /**
     * The history of the agent run.
     * Includes input items + new items generated during the run.
     * Can be used as input for the next agent run.
     */
    get history() {
        return [
            ...(typeof this.state.originalInput === 'string'
                ? [{ role: 'user', content: this.state.originalInput }]
                : this.state.originalInput),
            ...this.state.messages,
        ];
    }
    /**
     * The new items generated during the agent run.
     * These include messages, tool calls, tool outputs, etc.
     */
    get output() {
        return this.state.messages;
    }
    /**
     * The original input items (before the run)
     */
    get input() {
        return this.state.originalInput;
    }
    /**
     * All run items generated during the run
     */
    get newItems() {
        return this.state.items;
    }
    /**
     * Raw model responses
     */
    get rawResponses() {
        return this.state.modelResponses;
    }
    /**
     * The last response ID (if applicable)
     */
    get lastResponseId() {
        const responses = this.rawResponses;
        return responses && responses.length > 0
            ? responses[responses.length - 1].responseId
            : undefined;
    }
    /**
     * The last agent that ran
     */
    get lastAgent() {
        return this.state.currentAgent;
    }
    /**
     * The current agent (alias for lastAgent)
     */
    get currentAgent() {
        return this.lastAgent;
    }
    /**
     * Input guardrail results
     */
    get inputGuardrailResults() {
        return this.state.inputGuardrailResults || [];
    }
    /**
     * Output guardrail results
     */
    get outputGuardrailResults() {
        return this.state.outputGuardrailResults || [];
    }
    /**
     * Interruptions that occurred (tool approvals, etc.)
     */
    get interruptions() {
        return this.state.interruptions || [];
    }
    /**
     * Final output (already available in base result)
     */
    get finalOutput() {
        // This will be set by the caller
        return this._finalOutput;
    }
    set finalOutput(value) {
        this._finalOutput = value;
    }
    /**
     * Steps taken during the run
     */
    get steps() {
        return this._steps || [];
    }
    set steps(value) {
        this._steps = value;
    }
    /**
     * Metadata
     */
    get metadata() {
        return this._metadata || {};
    }
    set metadata(value) {
        this._metadata = value;
    }
    /**
     * Messages
     */
    get messages() {
        return this.state.messages;
    }
}
exports.RunResult = RunResult;
/**
 * Streaming run result
 */
class StreamedRunResult extends RunResult {
    constructor(state) {
        super(state);
        this._currentTurn = 0;
        this._cancelled = false;
        this._error = null;
        this._completed = new Promise((resolve, reject) => {
            this._resolveCompleted = resolve;
            this._rejectCompleted = reject;
        });
    }
    /**
     * Current turn number
     */
    get currentTurn() {
        return this._currentTurn;
    }
    set currentTurn(value) {
        this._currentTurn = value;
    }
    /**
     * Maximum turns
     */
    get maxTurns() {
        return this._maxTurns;
    }
    set maxTurns(value) {
        this._maxTurns = value;
    }
    /**
     * Whether the stream has been cancelled
     */
    get cancelled() {
        return this._cancelled;
    }
    /**
     * Cancel the stream
     */
    cancel() {
        this._cancelled = true;
    }
    /**
     * Promise that resolves when stream completes
     */
    get completed() {
        return this._completed;
    }
    /**
     * Error that occurred during streaming
     */
    get error() {
        return this._error;
    }
    /**
     * Mark as done
     */
    _done() {
        this._resolveCompleted?.();
    }
    /**
     * Set error
     */
    _raiseError(err) {
        this._error = err;
        this._rejectCompleted?.(err);
    }
    /**
     * Async iterator
     */
    async *[Symbol.asyncIterator]() {
        // Implementation would depend on streaming setup
        yield* [];
    }
    /**
     * Convert to text stream
     */
    toTextStream() {
        // Implementation would filter for text chunks
        return {
            async *[Symbol.asyncIterator]() {
                yield* [];
            }
        };
    }
}
exports.StreamedRunResult = StreamedRunResult;
//# sourceMappingURL=result.js.map