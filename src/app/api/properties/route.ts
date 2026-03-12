import { NextRequest, NextResponse } from 'next/server';
import { loadPropertiesServer } from '@/lib/data/server-loader';
import { loadPropertiesForInterpretation } from '@/lib/data/property-loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const interpretationName = request.nextUrl.searchParams.get('interpretation');

    const properties = interpretationName
      ? loadPropertiesForInterpretation(interpretationName)
      : loadPropertiesServer();

    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
      interpretationName: interpretationName || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load properties';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
