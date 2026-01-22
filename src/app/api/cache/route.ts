/**
 * API Route: /api/cache
 * 
 * Cache management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getResultCache } from '@/lib/cache/results';

export const dynamic = 'force-dynamic';

/**
 * GET: Get cache statistics
 */
export async function GET() {
  try {
    const cache = getResultCache();
    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error fetching cache stats:', error);
    
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
 * DELETE: Clear cache
 */
export async function DELETE() {
  try {
    const cache = getResultCache();
    cache.clear();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    
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
 * POST: Prune expired cache entries
 */
export async function POST() {
  try {
    const cache = getResultCache();
    const pruned = cache.prune();

    return NextResponse.json({
      success: true,
      data: {
        pruned,
        remaining: cache.size(),
      },
    });

  } catch (error) {
    console.error('Error pruning cache:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      },
      { status: 500 }
    );
  }
}
