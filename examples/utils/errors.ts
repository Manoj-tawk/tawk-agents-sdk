/**
 * Error Handling Utilities
 * 
 * Consistent error handling across all examples
 */

export interface ExampleError {
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
}

/**
 * Check if error is an API key error
 */
export function isAPIKeyError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string };
    return (
      err.message?.includes('API key') ||
      err.message?.includes('API_KEY') ||
      err.code === 'AI_LoadAPIKeyError' ||
      err.code?.includes('API_KEY')
    );
  }
  return false;
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string };
    return (
      err.message?.includes('connection') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('timeout') ||
      err.code === 'ECONNREFUSED'
    );
  }
  return false;
}

/**
 * Format error for user-friendly display
 */
export function formatError(error: unknown): ExampleError {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string };

    if (isAPIKeyError(error)) {
      return {
        code: 'API_KEY_MISSING',
        message: 'API key is missing',
        details: err.message,
        suggestion: 'Set OPENAI_API_KEY in your .env file or environment variables',
      };
    }

    if (isConnectionError(error)) {
      return {
        code: 'CONNECTION_ERROR',
        message: 'Connection failed',
        details: err.message,
        suggestion: 'Check your network connection and service availability',
      };
    }

    return {
      code: err.code || 'UNKNOWN_ERROR',
      message: err.message || 'An unknown error occurred',
      details: err.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}

/**
 * Handle error gracefully with user-friendly message
 */
export function handleError(error: unknown, context?: string): void {
  const formatted = formatError(error);

  console.error(`\n❌ Error${context ? ` in ${context}` : ''}:`);
  console.error(`   Code: ${formatted.code}`);
  console.error(`   Message: ${formatted.message}`);

  if (formatted.details && formatted.details !== formatted.message) {
    console.error(`   Details: ${formatted.details}`);
  }

  if (formatted.suggestion) {
    console.error(`\n💡 Suggestion: ${formatted.suggestion}`);
  }
}

/**
 * Check if API key is available
 */
export function checkAPIKey(provider: 'openai' | 'anthropic' | 'google'): boolean {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const key = process.env[keyMap[provider]];
  return !!key;
}

/**
 * Get API key status message
 */
export function getAPIKeyStatus(provider: 'openai' | 'anthropic' | 'google'): string {
  const hasKey = checkAPIKey(provider);
  return hasKey ? '✅ Configured' : '⚠️  Missing';
}

