/**
 * TOON (Token-Oriented Object Notation) Helper
 *
 * Provides utilities for encoding/decoding data in TOON format
 * for more efficient LLM token usage (40%+ reduction vs JSON)
 *
 * @see https://github.com/toon-format/toon
 */
/**
 * Encode data to TOON format for LLM consumption
 *
 * @example
 * const users = [
 *   { id: 1, name: 'Alice', role: 'admin' },
 *   { id: 2, name: 'Bob', role: 'user' }
 * ];
 * const toon = encodeTOON(users);
 * // Returns: users[2]{id,name,role}:\n  1,Alice,admin\n  2,Bob,user
 */
export declare function encodeTOON(data: any): string;
/**
 * Decode TOON format back to JavaScript object
 *
 * @example
 * const toon = 'users[2]{id,name}:\n  1,Alice\n  2,Bob';
 * const data = decodeTOON(toon);
 * // Returns: { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }
 */
export declare function decodeTOON(toonString: string): any;
/**
 * Format tool result in TOON for more efficient LLM context
 *
 * @example
 * const result = { status: 'success', data: { count: 42 } };
 * const formatted = formatToolResultTOON('getUserCount', result);
 */
export declare function formatToolResultTOON(toolName: string, result: any): string;
/**
 * Format multiple tool results in TOON
 */
export declare function formatToolResultsBatch(results: Array<{
    tool: string;
    result: any;
}>): string;
/**
 * Check if string is likely TOON format
 */
export declare function isTOONFormat(str: string): boolean;
/**
 * Smart decode - automatically detect and decode TOON or JSON
 */
export declare function smartDecode(str: string): any;
/**
 * Calculate token savings using TOON vs JSON
 */
export declare function calculateTokenSavings(data: any): {
    jsonTokens: number;
    toonTokens: number;
    savings: number;
    savingsPercent: number;
};
//# sourceMappingURL=toon.d.ts.map