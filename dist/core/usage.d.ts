/**
 * Token Usage Tracking
 *
 * @module core/usage
 * @description
 * Comprehensive token usage and cost tracking for agent runs.
 *
 * **Tracked Metrics**:
 * - Input tokens consumed
 * - Output tokens generated
 * - Total tokens used
 * - Number of API requests
 * - Estimated costs
 *
 * **Features**:
 * - Automatic accumulation across runs
 * - Per-agent metrics
 * - Cost estimation support
 * - Zero-overhead tracking
 * - Thread-safe operations
 *
 * @author Tawk.to
 * @license MIT
 * @version 1.0.0
 */
/**
 * Tracks token usage and request counts for an agent run.
 */
export declare class Usage {
    /**
     * The number of requests made to the LLM API.
     */
    requests: number;
    /**
     * The number of input tokens used across all requests.
     */
    inputTokens: number;
    /**
     * The number of output tokens used across all requests.
     */
    outputTokens: number;
    /**
     * The total number of tokens sent and received, across all requests.
     */
    totalTokens: number;
    constructor(input?: {
        requests?: number;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
    });
    /**
     * Add usage from another Usage instance
     */
    add(newUsage: Usage): void;
    /**
     * Convert to JSON for serialization
     */
    toJSON(): {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    /**
     * Estimate cost based on model pricing
     *
     * @param options - Options for cost estimation
     * @param options.model - Model name (e.g., 'gpt-4o', 'gpt-3.5-turbo')
     * @param options.inputPricePerMillion - Custom input price per million tokens
     * @param options.outputPricePerMillion - Custom output price per million tokens
     * @returns Estimated cost in USD
     *
     * @example
     * ```typescript
     * const cost = usage.estimateCost({ model: 'gpt-4o' });
     * console.log(`Estimated cost: $${cost.toFixed(4)}`);
     * ```
     */
    estimateCost(options?: {
        model?: string;
        inputPricePerMillion?: number;
        outputPricePerMillion?: number;
    }): number;
}
//# sourceMappingURL=usage.d.ts.map