/**
 * API Route: /api/interpret/[name]/evaluate
 * 
 * Evaluate a specific interpretation with property data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';
import { getResultCache } from '@/lib/cache/results';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    name: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Rate limiting
    if (!checkRateLimit(request)) {
      return rateLimitResponse();
    }

    const { name } = await params;
    const interpretationName = decodeURIComponent(name);

    if (!interpretationName) {
      return NextResponse.json(
        { error: 'Interpretation name is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const propertyData = body.properties || body.propertyData || body;

    if (!propertyData || typeof propertyData !== 'object') {
      return NextResponse.json(
        { error: 'Property data is required' },
        { status: 400 }
      );
    }

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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const status = errorMessage.includes('not found') ? 404 : 500;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status }
    );
  }
}
