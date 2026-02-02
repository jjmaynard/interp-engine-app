/**
 * Property Calculation API Route
 * 
 * Endpoint for calculating soil properties from NRCS Soil Data Access
 * Proxies requests to the Python property service
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { propertyService } from '@/lib/services/property-service';
import { PropertyServiceError } from '@/lib/errors/PropertyServiceError';

/**
 * Request validation schema
 */
const PropertyCalculationSchema = z.object({
  mukey: z.string().regex(/^\d+$/, 'MUKEY must be numeric'),
  propertyIds: z.array(z.number().int().positive()).min(1, 'At least one property ID required'),
  queryStrategy: z.enum(['individual', 'consolidated', 'auto']).optional().default('auto'),
});

export type PropertyCalculationRequest = z.infer<typeof PropertyCalculationSchema>;

/**
 * POST /api/properties/calculate
 * 
 * Calculate soil properties for a given MUKEY
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validated = PropertyCalculationSchema.parse(body);
    
    // Call property service
    const result = await propertyService.calculateProperties(
      validated.mukey,
      validated.propertyIds,
      validated.queryStrategy
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Property calculation error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    // Handle property service errors
    if (error instanceof PropertyServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.isServerError() ? 502 : error.statusCode }
      );
    }
    
    // Handle unknown errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/properties/calculate
 * 
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/properties/calculate',
    method: 'POST',
    description: 'Calculate soil properties for a given MUKEY from NRCS Soil Data Access',
    requestBody: {
      mukey: 'string (numeric) - Map Unit Key',
      propertyIds: 'number[] - Array of property IDs to calculate',
      queryStrategy: 'string (optional) - "individual" | "consolidated" | "auto" (default: "auto")',
    },
    example: {
      mukey: '462809',
      propertyIds: [2, 3, 4],
      queryStrategy: 'auto',
    },
    response: {
      success: 'boolean',
      values: 'Record<number, PropertyValue>',
      metadata: 'object with query statistics',
    },
  });
}
