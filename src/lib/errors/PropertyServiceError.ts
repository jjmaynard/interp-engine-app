/**
 * Error thrown when property service encounters an error
 */
export class PropertyServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PropertyServiceError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PropertyServiceError);
    }
  }

  /**
   * Check if error is a timeout
   */
  isTimeout(): boolean {
    return this.statusCode === 408;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}
