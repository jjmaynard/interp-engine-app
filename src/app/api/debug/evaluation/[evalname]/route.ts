/**
 * Debug API: Check evaluation data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultEngine } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    evalname: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { evalname } = await params;
    const decodedName = decodeURIComponent(evalname);

    const engine = await getDefaultEngine();
    // @ts-ignore - accessing private method for debugging
    const evaluation = engine.getEvaluation(decodedName);

    if (!evaluation) {
      return NextResponse.json({
        error: 'Evaluation not found',
        searchedFor: decodedName,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      evaluation: {
        evalname: evaluation.evalname,
        evaliid: evaluation.evaliid,
        propname: evaluation.propname,
        propiid: evaluation.propiid,
        interpolation: evaluation.interpolation,
        hasPoints: !!evaluation.points,
        pointsCount: evaluation.points?.length || 0,
        points: evaluation.points || [],
        invertevaluationresults: evaluation.invertevaluationresults,
      }
    });

  } catch (error) {
    console.error('Debug evaluation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}
