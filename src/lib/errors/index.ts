/**
 * Error Handling Utilities
 * 
 * Custom error classes and error handling functions for the interpretation engine
 */

/**
 * Base error class for interpretation engine
 */
export class InterpretationEngineError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'InterpretationEngineError';
  }
}

/**
 * Error for when an interpretation is not found
 */
export class InterpretationNotFoundError extends InterpretationEngineError {
  constructor(interpretationName: string) {
    super(`Interpretation not found: ${interpretationName}`, 'NOT_FOUND');
    this.name = 'InterpretationNotFoundError';
  }
}

/**
 * Error for invalid property data
 */
export class InvalidPropertyDataError extends InterpretationEngineError {
  constructor(message: string) {
    super(message, 'INVALID_PROPERTY_DATA');
    this.name = 'InvalidPropertyDataError';
  }
}

/**
 * Error for missing required properties
 */
export class MissingPropertiesError extends InterpretationEngineError {
  constructor(public missingProperties: string[]) {
    super(
      `Missing required properties: ${missingProperties.join(', ')}`,
      'MISSING_PROPERTIES'
    );
    this.name = 'MissingPropertiesError';
  }
}

/**
 * Error for evaluation failures
 */
export class EvaluationError extends InterpretationEngineError {
  constructor(message: string, public details?: any) {
    super(message, 'EVALUATION_ERROR');
    this.name = 'EvaluationError';
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends InterpretationEngineError {
  constructor(public validationErrors: string[]) {
    super(
      `Validation failed: ${validationErrors.join('; ')}`,
      'VALIDATION_ERROR'
    );
    this.name = 'ValidationError';
  }
}

/**
 * API Error response format
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Convert error to API response format
 * 
 * @param error - Error object
 * @returns Formatted error response
 */
export function formatErrorResponse(error: unknown): ApiErrorResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof InterpretationEngineError) {
    return {
      error: error.message,
      code: error.code,
      timestamp,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      timestamp,
    };
  }

  return {
    error: 'An unknown error occurred',
    timestamp,
  };
}

/**
 * Get HTTP status code for error
 * 
 * @param error - Error object
 * @returns HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof InterpretationNotFoundError) {
    return 404;
  }

  if (error instanceof InvalidPropertyDataError) {
    return 400;
  }

  if (error instanceof MissingPropertiesError) {
    return 400;
  }

  if (error instanceof ValidationError) {
    return 400;
  }

  if (error instanceof EvaluationError) {
    return 500;
  }

  return 500;
}

/**
 * Log error with context
 * 
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  };

  console.error('Interpretation Engine Error:', JSON.stringify(errorInfo, null, 2));
}

/**
 * Wrap async function with error handling
 * 
 * @param fn - Async function to wrap
 * @returns Wrapped function
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { function: fn.name, args });
      throw error;
    }
  }) as T;
}
