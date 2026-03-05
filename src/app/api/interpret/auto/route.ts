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
    
    console.log('[Auto Interpret] Request:', {
      interpretationName: validated.interpretationName,
      mukey: validated.mukey,
      areasymbol: validated.areasymbol,
    });
    
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
    
    // Step 2: Get required property IDs
    // Use the engine's full tree-traversal (getRequiredProperties) to discover ALL
    // property IDs referenced in the rule tree — including those from composite evaluations
    // that don't appear in the interpretation's static `properties` list.
    const engine = new InterpretationEngine({ evaluations: loadEvaluations() });
    await engine.initialize();
    const engineProperties = await engine.getRequiredProperties(validated.interpretationName);

    // Combine: static list (from interpretation_trees.json) + engine-discovered (deeper traversal)
    const staticIds = new Set((interpretation.properties || []).map(p => Number(p.propiid)).filter(n => !isNaN(n)));
    engineProperties.forEach(p => { if (p.propiid) staticIds.add(Number(p.propiid)); });
    const propertyIds = Array.from(staticIds);

    console.log('[Auto Interpret] Property IDs:', propertyIds.length, 'properties',
      '(static:', (interpretation.properties?.length || 0), '+ engine-discovered:', engineProperties.length, ')');
    
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
    
    console.log('[Auto Interpret] Python service result:', {
      success: calculationResult.success,
      valueCount: Object.keys(calculationResult.values).length,
      sampleValues: Object.entries(calculationResult.values).slice(0, 3).map(([k, v]) => [k, v, typeof v]),
      error: calculationResult.error,
    });
    
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
    // Keep id-keyed values for response/UI, and build name-keyed values for evaluator lookup
    const propertyValuesById: Record<number, any> = {};
    const propertyValuesForEvaluator: Record<string, any> = {};

    // Build property id -> property name map.
    // Layer 1: evaluations (the canonical propiid→propname source for tree-referenced props)
    const evalList = loadEvaluations();
    const propertyIdToName = new Map<number, string>();
    for (const ev of evalList) {
      const pid = Number((ev as any).propiid);
      if (!Number.isNaN(pid) && (ev as any).propname && !propertyIdToName.has(pid)) {
        propertyIdToName.set(pid, (ev as any).propname);
      }
    }
    // Layer 2: engine-discovered properties (covers propiids that have no evaluation entry,
    // e.g., when properties_enhanced.json has a newer propiid for a duplicate propname)
    for (const prop of engineProperties) {
      const pid = Number(prop.propiid);
      if (!Number.isNaN(pid) && prop.propname && !propertyIdToName.has(pid)) {
        propertyIdToName.set(pid, prop.propname);
      }
    }

    for (const [propId, propValue] of Object.entries(calculationResult.values)) {
      console.log(`[Auto Interpret] Processing prop ${propId}:`, propValue, typeof propValue, JSON.stringify(propValue));

      const numericPropId = parseInt(propId, 10);
      const propName = propertyIdToName.get(numericPropId);
      let normalizedValue: any;
      
      if (propValue && typeof propValue === 'object' && 'status' in propValue) {
        // New PropertyValue format with status metadata
        normalizedValue = propValue;
      } else if (typeof propValue === 'number' || typeof propValue === 'string') {
        // Simple value format from Python service (backward compatibility)
        normalizedValue = {
          value: propValue,
          status: 'present',
          confidence: 'high',
          source: 'ssurgo'
        };
      } else if (propValue && typeof propValue === 'object' && 'value' in propValue) {
        // Wrapped format without status - add default status
        normalizedValue = {
          ...propValue,
          status: (propValue as any).status || 'present',
          source: (propValue as any).source || 'ssurgo'
        };
      } else {
        // Null or undefined
        normalizedValue = {
          value: null,
          status: 'missing',
          source: 'ssurgo'
        };
      }

      // Preserve existing id-keyed payload for UI compatibility
      propertyValuesById[numericPropId] = normalizedValue;

      // Provide evaluator-friendly lookups by property name and id-string alias
      if (propName) {
        propertyValuesForEvaluator[propName] = normalizedValue;
      }
      propertyValuesForEvaluator[String(numericPropId)] = normalizedValue;
    }
    
    console.log('[Auto Interpret] Property values for evaluator:', {
      count: Object.keys(propertyValuesForEvaluator).length,
      sampleValues: Object.entries(propertyValuesForEvaluator).slice(0, 5),
      nullCount: Object.values(propertyValuesForEvaluator).filter(v => v === null).length,
    });
    
    // Step 5: Evaluate interpretation (engine already initialized in Step 2)
    const evaluationResult = await engine.evaluate(validated.interpretationName, propertyValuesForEvaluator);

    console.log('[Auto Interpret] Evaluation result:', {
      rating: evaluationResult.rating,
      ratingClass: evaluationResult.ratingClass,
      hasRatingClass: 'ratingClass' in evaluationResult,
    });

    // Step 6: Return combined result
    const totalTime = Date.now() - startTime;

    // Build propname-keyed values map for robust page-level mapping
    // (avoids mismatch when properties_enhanced.json has a different propiid for the same propname)
    const propertyValuesByName: Record<string, any> = {};
    for (const [propId, propValue] of Object.entries(propertyValuesById)) {
      const numId = parseInt(propId, 10);
      const pname = propertyIdToName.get(numId);
      if (pname) {
        propertyValuesByName[pname] = propValue;
      }
    }

    return NextResponse.json({
      success: true,
      interpretation: {
        rulename: interpretation.rulename,
        result: evaluationResult,
      },
      properties: {
        requested: propertyIds.length,
        calculated: Object.keys(propertyValuesById).length,
        values: propertyValuesById,       // keyed by Python service propiid
        valuesByName: propertyValuesByName, // keyed by canonical propname (robust mapping)
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
