/**
 * API Route: /api/interpret/batch
 * 
 * Batch evaluate a soil interpretation with multiple property data records
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';
import { validateBatchInterpretRequest } from '@/lib/validation/requests';
import { getResultCache } from '@/lib/cache/results';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    if (!checkRateLimit(request)) {
      return rateLimitResponse();
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateBatchInterpretRequest(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validation.errors,
          success: false 
        },
        { status: 400 }
      );
    }

    const { interpretationName, propertyDataArray } = validation.data!;

    // Get engine instance
    const engine = await getDefaultEngine();
    const cache = getResultCache();

    // Check cache for each record and evaluate uncached ones
    const results = [];
    const uncachedIndices = [];
    const uncachedData = [];

    for (let i = 0; i < propertyDataArray.length; i++) {
      const propertyData = propertyDataArray[i];
      const cached = cache.get(interpretationName, propertyData);

      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedData.push(propertyData);
      }
    }

    // Perform batch evaluation for uncached records
    const startTime = Date.now();
    const uncachedResults = uncachedData.length > 0
      ? await engine.batchEvaluate(interpretationName, uncachedData)
      : [];
    const duration = Date.now() - startTime;

    // Merge results and cache new ones
    for (let i = 0; i < uncachedIndices.length; i++) {
      const index = uncachedIndices[i];
      const result = uncachedResults[i];
      results[index] = result;
      cache.set(interpretationName, uncachedData[i], result);
    }

    // Return results
    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        count: results.length,
        cached: propertyDataArray.length - uncachedData.length,
        evaluated: uncachedData.length,
        durationMs: duration,
        averageMs: uncachedData.length > 0 ? duration / uncachedData.length : 0,
      },
    });

  } catch (error) {
    console.error('Batch interpretation evaluation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      },
      { status: 500 }
    );
  }
}
