/**
 * Property utility functions
 * Metadata-backed helpers for working with soil properties.
 */

import type { Property, Evaluation } from '@/types/interpretation';

/**
 * Categorical status is precomputed in properties_metadata.json.
 */
export function isCategoricalProperty(property: Property): boolean {
  return Boolean(property.isCategorical);
}

/**
 * Choices are precomputed in properties_metadata.json.
 * Evaluations are no longer parsed at runtime for this purpose.
 */
export function extractChoicesFromEvaluations(
  propertyName: string,
  evaluations: Evaluation[]
): string[] {
  void propertyName;
  void evaluations;
  return [];
}

/**
 * Property metadata is already precomputed, so this is a pass-through helper.
 */
export function enhanceProperty(
  property: Property,
  evaluations: Evaluation[]
): Property {
  void evaluations;
  return property;
}

/**
 * Property metadata is already precomputed, so this is a pass-through helper.
 */
export function enhanceProperties(
  properties: Property[],
  evaluations: Evaluation[]
): Property[] {
  void evaluations;
  return properties;
}
