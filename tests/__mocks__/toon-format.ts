/**
 * Mock for @toon-format/toon package
 * Used in Jest tests to avoid ES module import issues
 */

export function encode(data: any): string {
  // Simple mock implementation
  return JSON.stringify(data);
}

export function decode(toonString: string): any {
  // Simple mock implementation
  try {
    return JSON.parse(toonString);
  } catch {
    return toonString;
  }
}

export const DEFAULT_DELIMITER = ':';
export const DELIMITERS = { field: ',', row: '\n', block: ':' };

