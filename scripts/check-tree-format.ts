import 'dotenv/config';
import { db } from '@/lib/db';
import { interpretations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const interpName = process.argv[2] || 'AGR - California Revised Storie Index (CA)';

  const result = await db.select()
    .from(interpretations)
    .where(eq(interpretations.name, interpName))
    .limit(1);

  if (!result[0]) {
    console.error('Interpretation not found');
    process.exit(1);
  }

  const tree = result[0].treeStructure;
  console.log('\n=== Tree Structure Analysis ===');
  console.log('Type:', typeof tree);
  console.log('Is array:', Array.isArray(tree));

  if (typeof tree === 'object' && tree !== null) {
    console.log('\nObject keys:', Object.keys(tree).slice(0, 10));
    console.log('Has .tree property:', 'tree' in tree);
    
    if ('tree' in tree) {
      console.log('\n--- tree.tree analysis ---');
      console.log('tree.tree is array:', Array.isArray((tree as any).tree));
      console.log('tree.tree length:', (tree as any).tree?.length || 0);
      if ((tree as any).tree?.[0]) {
        console.log('First node keys:', Object.keys((tree as any).tree[0]));
        console.log('First node:', JSON.stringify((tree as any).tree[0], null, 2));
      }
    } else if (Array.isArray(tree)) {
      console.log('\n--- Direct array analysis ---');
      console.log('Direct array length:', tree.length);
      if (tree[0]) {
        console.log('First item keys:', Object.keys(tree[0]));
        console.log('First item:', JSON.stringify(tree[0], null, 2));
      }
    }
  }

  process.exit(0);
}

main();
