/**
 * API Route: /api/interpret/[name]
 * 
 * Get interpretation details including properties and rule tree
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';

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
