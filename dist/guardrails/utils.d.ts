/**
 * Guardrails Shared Utilities
 *
 * @module guardrails/utils
 * @description Helper functions for guardrail validation
 */
/**
 * Create a traced generation for LLM-based guardrails
 * Wraps the guardrail execution in proper Langfuse tracing
 */
export declare function createGuardrailGeneration(config: {
    name: string;
    model: any;
    systemPrompt: string;
    content: string;
    type: 'input' | 'output';
    metadata?: Record<string, any>;
}): any;
/**
 * End a guardrail generation with usage tracking
 */
export declare function endGuardrailGeneration(generation: any, result: any, passed: boolean): void;
/**
 * PII detection patterns
 */
export declare const PII_PATTERNS: {
    email: RegExp;
    phone: RegExp;
    ssn: RegExp;
    creditCard: RegExp;
    ipAddress: RegExp;
};
/**
 * Calculate content length based on unit
 * @param content - The content to measure
 * @param unit - Unit of measurement (characters or words)
 * @returns The length of the content in the specified unit
 */
export declare function calculateLength(content: string, unit?: 'characters' | 'words'): number;
//# sourceMappingURL=utils.d.ts.map