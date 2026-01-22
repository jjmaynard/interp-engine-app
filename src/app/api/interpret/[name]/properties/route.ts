/**
 * API Route: /api/interpret/[name]/properties
 * 
 * Get required properties for a specific interpretation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    name: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const interpretationName = decodeURIComponent(params.name);

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

    // Return properties
    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
      interpretationName,
    });

  } catch (error) {
    console.error('Error fetching properties:', error);
    
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
