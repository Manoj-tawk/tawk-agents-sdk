/**
 * Result Types - Enhanced RunResult
 *
 * Provides rich result types with history, output, metadata, and more.
 *
 * @module result
 */
import type { Agent } from './agent';
import type { RunState, RunItem, ModelResponse } from './runstate';
import type { ModelMessage } from 'ai';
/**
 * Enhanced RunResult with additional properties
 */
export declare class RunResult<TContext = any, TAgent extends Agent<TContext, any> = Agent<any, any>> {
    readonly state: RunState<TContext>;
    constructor(state: RunState<TContext>);
    /**
     * The history of the agent run.
     * Includes input items + new items generated during the run.
     * Can be used as input for the next agent run.
     */
    get history(): ModelMessage[];
    /**
     * The new items generated during the agent run.
     * These include messages, tool calls, tool outputs, etc.
     */
    get output(): ModelMessage[];
    /**
     * The original input items (before the run)
     */
    get input(): string | ModelMessage[];
    /**
     * All run items generated during the run
     */
    get newItems(): RunItem[];
    /**
     * Raw model responses
     */
    get rawResponses(): ModelResponse[];
    /**
     * The last response ID (if applicable)
     */
    get lastResponseId(): string | undefined;
    /**
     * The last agent that ran
     */
    get lastAgent(): TAgent | undefined;
    /**
     * The current agent (alias for lastAgent)
     */
    get currentAgent(): TAgent | undefined;
    /**
     * Input guardrail results
     */
    get inputGuardrailResults(): any[];
    /**
     * Output guardrail results
     */
    get outputGuardrailResults(): any[];
    /**
     * Interruptions that occurred (tool approvals, etc.)
     */
    get interruptions(): any[];
    /**
     * Final output (already available in base result)
     */
    get finalOutput(): any;
    set finalOutput(value: any);
    /**
     * Steps taken during the run
     */
    get steps(): any[];
    set steps(value: any[]);
    /**
     * Metadata
     */
    get metadata(): any;
    set metadata(value: any);
    /**
     * Messages
     */
    get messages(): ModelMessage[];
}
/**
 * Streaming run result
 */
export declare class StreamedRunResult<TContext = any, TAgent extends Agent<TContext, any> = Agent<any, any>> extends RunResult<TContext, TAgent> implements AsyncIterable<any> {
    private _currentTurn;
    private _maxTurns;
    private _cancelled;
    private _error;
    private _completed;
    private _resolveCompleted?;
    private _rejectCompleted?;
    constructor(state: RunState<TContext>);
    /**
     * Current turn number
     */
    get currentTurn(): number;
    set currentTurn(value: number);
    /**
     * Maximum turns
     */
    get maxTurns(): number | undefined;
    set maxTurns(value: number | undefined);
    /**
     * Whether the stream has been cancelled
     */
    get cancelled(): boolean;
    /**
     * Cancel the stream
     */
    cancel(): void;
    /**
     * Promise that resolves when stream completes
     */
    get completed(): Promise<void>;
    /**
     * Error that occurred during streaming
     */
    get error(): unknown;
    /**
     * Mark as done
     */
    _done(): void;
    /**
     * Set error
     */
    _raiseError(err: unknown): void;
    /**
     * Async iterator
     */
    [Symbol.asyncIterator](): AsyncIterator<any>;
    /**
     * Convert to text stream
     */
    toTextStream(): AsyncIterable<string>;
}
//# sourceMappingURL=result.d.ts.map