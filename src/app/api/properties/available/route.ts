/**
 * Available Properties API Route
 * 
 * Endpoint for retrieving list of available soil properties
 */

import { NextResponse } from 'next/server';
import { propertyService } from '@/lib/services/property-service';
import { PropertyServiceError } from '@/lib/errors/PropertyServiceError';

/**
 * GET /api/properties/available
 * 
 * Get list of all available properties
 */
export async function GET() {
  try {
    const properties = await propertyService.getAvailableProperties();
    
    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
    });
    
  } catch (error) {
    console.error('Failed to fetch available properties:', error);
    
    if (error instanceof PropertyServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.isServerError() ? 502 : error.statusCode }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available properties',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
