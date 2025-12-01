/**
 * Mock for @toon-format/toon
 * 
 * Provides mock implementations of encode and decode functions
 * for testing purposes.
 */

export function encode(data: any): string {
  // Simple mock: just return JSON stringified data
  // In real implementation, this would convert to TOON format
  return JSON.stringify(data);
}

export function decode(toon: string): any {
  // Simple mock: just parse JSON
  // In real implementation, this would parse TOON format
  return JSON.parse(toon);
}


