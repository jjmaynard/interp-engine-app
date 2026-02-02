/**
 * API Route: /api/interpret
 * 
 * Evaluate a soil interpretation with property data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';
import { validateInterpretRequest } from '@/lib/validation/requests';
import { getResultCache } from '@/lib/cache/results';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    if (!checkRateLimit(request)) {
      return rateLimitResponse();
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateInterpretRequest(body);

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

    const { interpretationName, propertyData } = validation.data!;

    // Check cache first
    const cache = getResultCache();
    const cached = cache.get(interpretationName, propertyData);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get engine instance and evaluate
    const engine = await getDefaultEngine();
    const result = await engine.evaluate(interpretationName, propertyData);

    // Cache result
    cache.set(interpretationName, propertyData, result);

    // Return result
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
    });

  } catch (error) {
    console.error('Interpretation evaluation error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to return available interpretations
 */
export async function GET() {
  try {
    const engine = await getDefaultEngine();
    const interpretations = await engine.getAvailableInterpretations();

    // Format for API response with actual property counts
    const formatted = interpretations.map((interp) => {
      return {
        name: interp.rulename || 'Unknown',
        propertyCount: interp.property_count || interp.properties?.length || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      count: formatted.length,
    });

  } catch (error) {
    console.error('Error fetching interpretations:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      },
      { status: 500 }
    );
  }
}
