/**
 * API Route: /api/health
 * 
 * Health check endpoint for the interpretation engine
 */

import { NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const engine = await getDefaultEngine();
    const cacheStats = engine.getCacheStats();
    const interpretations = await engine.getAvailableInterpretations();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      engine: {
        interpretationsLoaded: interpretations.length,
        cache: {
          interpretations: cacheStats.isCached.interpretations,
          evaluations: cacheStats.isCached.evaluations,
          properties: cacheStats.isCached.properties,
          ttlMinutes: Math.floor(cacheStats.cacheTTL / 1000 / 60),
        },
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
