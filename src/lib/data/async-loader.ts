import type { PropertyMetadata } from '@/lib/data/property-metadata';

// Client-safe dynamic loader for lightweight property metadata.
export async function loadPropertiesMetadataAsync(): Promise<PropertyMetadata[]> {
  const module = await import('@/data/properties_metadata.json');
  return module.default as PropertyMetadata[];
}
