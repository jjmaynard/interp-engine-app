/**
 * API Middleware Utilities
 * 
 * Utilities for validating and handling API requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse, getErrorStatusCode, logError } from '@/lib/errors';

/**
 * Wrap API handler with error handling and logging
 * 
 * @param handler - API route handler
 * @returns Wrapped handler
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      logError(error, {
        url: request.url,
        method: request.method,
      });

      const errorResponse = formatErrorResponse(error);
      const statusCode = getErrorStatusCode(error);

      return NextResponse.json(
        { ...errorResponse, success: false },
        { status: statusCode }
      );
    }
  };
}

/**
 * Parse and validate JSON request body
 * 
 * @param request - Next.js request
 * @returns Parsed body or error response
 */
export async function parseJsonBody<T>(
  request: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    return { data: body as T };
  } catch (error) {
    return {
      error: NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          success: false,
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight requests
 * 
 * @returns OPTIONS response with CORS headers
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to response
 * 
 * @param response - Response to add headers to
 * @returns Response with CORS headers
 */
export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Rate limiting (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Filter out old requests
    const recentRequests = requests.filter(
      time => now - time < this.windowMs
    );

    if (recentRequests.length >= this.limit) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

const rateLimiter = new RateLimiter();

/**
 * Apply rate limiting to request
 * 
 * @param request - Next.js request
 * @returns True if request is allowed
 */
export function checkRateLimit(request: NextRequest): boolean {
  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  return rateLimiter.check(identifier);
}

/**
 * Create rate limit error response
 * 
 * @returns 429 Too Many Requests response
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      success: false,
    },
    { status: 429 }
  );
}
