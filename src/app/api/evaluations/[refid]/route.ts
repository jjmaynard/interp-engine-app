/**
 * API Route: /api/evaluations/[refid]
 * 
 * Get evaluation data by RefId for fuzzy curve display
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    refid: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { refid } = await params;

    if (!refid) {
      return NextResponse.json(
        { error: 'RefId is required' },
        { status: 400 }
      );
    }

    // Get engine instance
    const engine = await getDefaultEngine();

    // Access private evaluationsMap to get evaluation data
    // @ts-ignore - accessing private property for API
    const evaluation = engine.evaluationsMap.get(String(refid));

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found', refid },
        { status: 404 }
      );
    }

    // Return evaluation data needed for fuzzy curve
    return NextResponse.json({
      success: true,
      data: {
        evaliid: evaluation.evaliid,
        evalname: evaluation.evalname,
        propname: evaluation.propname,
        evaluationtype: evaluation.evaluationtype,
        invertevaluationresults: evaluation.invertevaluationresults,
        points: evaluation.points || [],
        interpolation: evaluation.interpolation || 'linear',
        Property: evaluation.propname,
        Points: evaluation.points || [],
        Interpolation: evaluation.interpolation || 'linear',
        Invert: evaluation.invertevaluationresults || false,
      },
    });

  } catch (error) {
    console.error('Error fetching evaluation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}
