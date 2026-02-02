/**
 * Auto Interpretation API Route
 * 
 * KEY ENDPOINT: Automatically calculates properties and evaluates interpretation
 * This combines the Python property service with the Next.js interpretation engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { propertyService } from '@/lib/services/property-service';
import { PropertyServiceError } from '@/lib/errors/PropertyServiceError';
import { getInterpretationByName } from '@/lib/data/loader';
import { InterpretationEngine } from '@/lib/engine/InterpretationEngine';
import { loadEvaluations } from '@/lib/data/loader';

/**
 * Request validation schema
 */
const AutoInterpretSchema = z.object({
  interpretationName: z.string().min(1, 'Interpretation name is required'),
  mukey: z.string().regex(/^\d+$/, 'MUKEY must be numeric').optional(),
  areasymbol: z.string().optional(),
}).refine(
  data => data.mukey || data.areasymbol,
  {
    message: 'Either mukey or areasymbol must be provided',
    path: ['mukey'],
  }
);

export type AutoInterpretRequest = z.infer<typeof AutoInterpretSchema>;

/**
 * POST /api/interpret/auto
 * 
 * Automatically calculate properties and evaluate interpretation
 * 
 * Workflow:
 * 1. Get interpretation tree by name
 * 2. Extract required property IDs
 * 3. Call Python service to calculate properties from SSURGO
 * 4. Evaluate interpretation with calculated values
 * 5. Return combined result with metadata
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate request
    const validated = AutoInterpretSchema.parse(body);
    
    // Step 1: Get interpretation
    const interpretation = getInterpretationByName(validated.interpretationName);
    
    if (!interpretation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Interpretation not found',
          interpretationName: validated.interpretationName,
        },
        { status: 404 }
      );
    }
    
    // Step 2: Get required property IDs from interpretation tree
    const propertyIds = interpretation.properties?.map(p => Number(p.propiid)) || [];
    
    if (propertyIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Interpretation has no properties defined',
          interpretationName: validated.interpretationName,
        },
        { status: 400 }
      );
    }
    
    // Step 3: Calculate properties from SSURGO
    // Use MUKEY if provided, otherwise would need to resolve areasymbol to MUKEY
    if (!validated.mukey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MUKEY is required (areasymbol resolution not yet implemented)',
        },
        { status: 400 }
      );
    }
    
    const calculationResult = await propertyService.calculateProperties(
      validated.mukey,
      propertyIds,
      'auto' // Use auto strategy for optimal performance
    );
    
    if (!calculationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property calculation failed',
          details: calculationResult.error,
          metadata: calculationResult.metadata,
        },
        { status: 500 }
      );
    }
    
    // Step 4: Prepare property values for interpretation engine
    // Convert from Record<number, PropertyValue> to Record<number, number>
    const propertyValues: Record<number, number | null> = {};
    for (const [propId, propValue] of Object.entries(calculationResult.values)) {
      // Use the 'value' field, handle null/undefined
      const value = propValue?.value;
      propertyValues[parseInt(propId)] = typeof value === 'number' ? value : null;
    }
    
    // Step 5: Evaluate interpretation
    const engine = new InterpretationEngine({ evaluations: loadEvaluations() });
    await engine.initialize();
    const evaluationResult = await engine.evaluate(validated.interpretationName, propertyValues);
    
    // Step 6: Return combined result
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      interpretation: {
        rulename: interpretation.rulename,
        result: evaluationResult,
      },
      properties: {
        requested: propertyIds.length,
        calculated: Object.keys(calculationResult.values).length,
        values: calculationResult.values,
      },
      metadata: {
        mukey: validated.mukey,
        interpretationName: validated.interpretationName,
        propertyCalculation: calculationResult.metadata,
        totalExecutionTimeMs: totalTime,
        evaluatedAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Auto interpretation error:', error);
    
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
          error: 'Property service error',
          message: error.message,
          statusCode: error.statusCode,
        },
        { status: error.isServerError() ? 502 : 500 }
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
 * GET /api/interpret/auto
 * 
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/interpret/auto',
    method: 'POST',
    description: 'Automatically calculate properties and evaluate interpretation',
    workflow: [
      '1. Get interpretation tree by name',
      '2. Extract required property IDs',
      '3. Call Python service to calculate properties from SSURGO',
      '4. Evaluate interpretation with calculated values',
      '5. Return combined result with metadata',
    ],
    requestBody: {
      interpretationName: 'string - Name of the interpretation',
      mukey: 'string (optional) - Map Unit Key',
      areasymbol: 'string (optional) - Area symbol (not yet implemented)',
    },
    example: {
      interpretationName: 'AGR - Soil Quality Index',
      mukey: '462809',
    },
    response: {
      success: 'boolean',
      interpretation: {
        name: 'string',
        result: 'InterpretationResult - fuzzy value, rating, etc.',
      },
      properties: {
        requested: 'number',
        calculated: 'number',
        values: 'Record<number, PropertyValue>',
      },
      metadata: {
        mukey: 'string',
        interpretationName: 'string',
        propertyCalculation: 'object with query stats',
        totalExecutionTimeMs: 'number',
        evaluatedAt: 'string (ISO timestamp)',
      },
    },
  });
}
