import 'server-only';

import fs from 'fs';
import path from 'path';
import type { Evaluation, InterpretationTree } from '@/types/interpretation';
import { metadataToProperty, type PropertyMetadata } from '@/lib/data/property-metadata';

let evaluationsCache: Evaluation[] | null = null;
let propertiesMetadataCache: PropertyMetadata[] | null = null;
let interpretationsCache: InterpretationTree[] | null = null;

export function loadEvaluationsServer(): Evaluation[] {
  if (evaluationsCache) return evaluationsCache;

  const filePath = path.join(process.cwd(), 'src', 'data', 'evaluations.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Evaluation[];
  evaluationsCache = data;
  return data;
}

export function loadPropertiesMetadataServer(): PropertyMetadata[] {
  if (propertiesMetadataCache) return propertiesMetadataCache;

  const filePath = path.join(process.cwd(), 'src', 'data', 'properties_metadata.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PropertyMetadata[];
  propertiesMetadataCache = data;
  return data;
}

export function loadPropertiesServer() {
  return loadPropertiesMetadataServer().map(metadataToProperty);
}

export function loadInterpretationTreesServer(): InterpretationTree[] {
  if (interpretationsCache) return interpretationsCache;

  const filePath = path.join(process.cwd(), 'src', 'data', 'interpretation_trees.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as InterpretationTree[];
  interpretationsCache = data;
  return data;
}

export function clearServerDataCache(): void {
  evaluationsCache = null;
  propertiesMetadataCache = null;
  interpretationsCache = null;
}
