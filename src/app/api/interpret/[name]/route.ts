/**
 * API Route: /api/interpret/[name]
 * 
 * GET: Get interpretation details including properties and rule tree
 * POST: Evaluate interpretation with property data
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

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { name } = await params;
    const interpretationName = decodeURIComponent(name);

    if (!interpretationName) {
      return NextResponse.json(
        { error: 'Interpretation name is required' },
        { status: 400 }
      );
    }

    // Get engine instance
    const engine = await getDefaultEngine();

    // Get required properties
    const properties = await engine.getRequiredProperties(interpretationName);
    
    // Get rule tree
    const tree = await engine.getRuleTree(interpretationName);

    // Return both properties and tree
    return NextResponse.json({
      success: true,
      data: {
        properties,
        tree,
        interpretationName,
      },
      count: properties.length,
    });

  } catch (error) {
    console.error('Error fetching interpretation data:', error);
    
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

    console.log('[Evaluate API] Interpretation:', interpretationName);
    console.log('[Evaluate API] Property data received:', Object.keys(propertyData).length, 'properties');
    console.log('[Evaluate API] Sample properties:', Object.keys(propertyData).slice(0, 3));

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
      console.log('[Evaluate API] Returning cached result');
      console.log('[Evaluate API] Cached rating:', cached.rating);
      console.log('[Evaluate API] Cached rating class:', cached.ratingClass);
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    console.log('[Evaluate API] No cache hit, evaluating...');

    // Get engine instance and evaluate
    const engine = await getDefaultEngine();
    const result = await engine.evaluate(interpretationName, propertyData);

    console.log('[Evaluate API] Evaluation complete');
    console.log('[Evaluate API] Result rating:', result.rating);
    console.log('[Evaluate API] Result rating class:', result.ratingClass);
    console.log('[Evaluate API] Evaluation results count:', Object.keys(result.evaluationResults || {}).length);

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
