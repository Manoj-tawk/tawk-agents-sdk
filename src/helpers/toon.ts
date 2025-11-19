/**
 * TOON (Token-Oriented Object Notation) Helper
 * 
 * Provides utilities for encoding/decoding data in TOON format
 * for more efficient LLM token usage (40%+ reduction vs JSON)
 * 
 * @see https://github.com/toon-format/toon
 */

import { encode as toonEncode, decode as toonDecode } from '@toon-format/toon';

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
export function encodeTOON(data: any): string {
  try {
    return toonEncode(data);
  } catch (error) {
    console.warn('Failed to encode to TOON, falling back to JSON:', error);
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Decode TOON format back to JavaScript object
 * 
 * @example
 * const toon = 'users[2]{id,name}:\n  1,Alice\n  2,Bob';
 * const data = decodeTOON(toon);
 * // Returns: { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }
 */
export function decodeTOON(toonString: string): any {
  try {
    return toonDecode(toonString);
  } catch (error) {
    console.warn('Failed to decode TOON, attempting JSON parse:', error);
    try {
      return JSON.parse(toonString);
    } catch {
      throw new Error('Invalid TOON or JSON format');
    }
  }
}

/**
 * Format tool result in TOON for more efficient LLM context
 * 
 * @example
 * const result = { status: 'success', data: { count: 42 } };
 * const formatted = formatToolResultTOON('getUserCount', result);
 */
export function formatToolResultTOON(toolName: string, result: any): string {
  const toonResult = encodeTOON(result);
  return `Tool: ${toolName}\nResult (TOON):\n${toonResult}`;
}

/**
 * Format multiple tool results in TOON
 */
export function formatToolResultsBatch(results: Array<{ tool: string; result: any }>): string {
  const toonResults = results.map(({ tool, result }) => {
    return `${tool}: ${encodeTOON(result)}`;
  });
  return toonResults.join('\n\n');
}

/**
 * Check if string is likely TOON format
 */
export function isTOONFormat(str: string): boolean {
  // Basic heuristic: TOON format typically has array notation with schema
  return /\[\d+\]\{[^}]+\}:/.test(str) || /\{[^}]+\}:/.test(str);
}

/**
 * Smart decode - automatically detect and decode TOON or JSON
 */
export function smartDecode(str: string): any {
  if (isTOONFormat(str)) {
    return decodeTOON(str);
  }
  try {
    return JSON.parse(str);
  } catch {
    throw new Error('Could not parse as TOON or JSON');
  }
}

/**
 * Calculate token savings using TOON vs JSON
 */
export function calculateTokenSavings(data: any): {
  jsonTokens: number;
  toonTokens: number;
  savings: number;
  savingsPercent: number;
} {
  const json = JSON.stringify(data);
  const toon = encodeTOON(data);
  
  // Rough token estimation (1 token ≈ 4 characters)
  const jsonTokens = Math.ceil(json.length / 4);
  const toonTokens = Math.ceil(toon.length / 4);
  const savings = jsonTokens - toonTokens;
  const savingsPercent = Math.round((savings / jsonTokens) * 100);
  
  return { jsonTokens, toonTokens, savings, savingsPercent };
}

