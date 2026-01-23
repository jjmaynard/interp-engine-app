/**
 * One-time API endpoint to fix interpretation data structures
 * DELETE THIS FILE after running once
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { interpretations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Import source data
import sourceData from '@/data/primary_interpretation_trees.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET() {
  try {
    const startTime = Date.now();
    console.log('🔧 Fixing interpretation data structures...\n');
    
    const db = getDb();
    
    console.log(`📦 Loaded ${sourceData.length} interpretations from source file\n`);
    
    let updated = 0;
    let notFound = 0;
    const notFoundNames: string[] = [];
    
    for (const interp of sourceData) {
      // Find the interpretation by name
      const [existing] = await db
        .select()
        .from(interpretations)
        .where(eq(interpretations.name, interp.name))
        .limit(1);
      
      if (!existing) {
        notFound++;
        notFoundNames.push(interp.name);
        continue;
      }
      
      // Update with tree structure directly
      await db
        .update(interpretations)
        .set({
          treeStructure: interp.tree, // Store tree array directly, not wrapped
        })
        .where(eq(interpretations.id, existing.id));
      
      updated++;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: true,
      message: 'Interpretation data structures fixed',
      stats: {
        updated,
        notFound,
        notFoundNames: notFoundNames.slice(0, 10), // First 10 only
        totalSource: sourceData.length,
        duration: `${duration}s`,
      },
    });
    
  } catch (error) {
    console.error('Fix error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
