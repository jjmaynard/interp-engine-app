import type { Property } from '@/types/interpretation';

export interface PropertyMetadata {
  propid: number;
  propname: string;
  propuom: string | null;
  propmin: number | null;
  propmax: number | null;
  isCategorical: boolean;
  choices: string[];
  description?: string | null;
  category?: string | null;
}

export function metadataToProperty(metadata: PropertyMetadata): Property {
  return {
    propiid: metadata.propid,
    propname: metadata.propname,
    propuom: metadata.propuom,
    propmin: metadata.propmin,
    propmax: metadata.propmax,
    propmod: null,
    dataafuse: null,
    propdesc: metadata.description ?? null,
    isCategorical: metadata.isCategorical,
    choices: metadata.choices,
  };
}
