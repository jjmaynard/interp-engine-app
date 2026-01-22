/**
 * Data validation utilities
 * Validates interpretation data structure and content
 */

import { z } from 'zod';
import {
  InterpretationTree,
  Evaluation,
  Property
} from '@/types/interpretation';

/**
 * Zod schema for EvaluationPoint
 */
const EvaluationPointSchema = z.object({
  x: z.number(),
  y: z.number().min(0).max(1)
});

/**
 * Zod schema for Evaluation
 */
const EvaluationSchema = z.object({
  propiid: z.string().optional(),
  evaliid: z.number(),
  evalname: z.string(),
  evaldesc: z.string(),
  eval: z.string(),
  'dataafuse.x': z.boolean().optional(),
  evaluationtype: z.string(),
  invertevaluationresults: z.boolean(),
  propmod: z.string(),
  propname: z.string(),
  'dataafuse.y': z.boolean().optional(),
  points: z.array(EvaluationPointSchema).optional(),
  interpolation: z.enum(['linear', 'spline', 'step']).optional(),
  crispExpression: z.string().optional(),
  domainPoints: z.record(z.string(), z.number()).optional()
});

/**
 * Zod schema for Property
 */
const PropertySchema = z.object({
  propiid: z.string(),
  propname: z.string(),
  propuom: z.string().optional(),
  propmin: z.number().optional(),
  propmax: z.number().optional(),
  propmod: z.string(),
  dataafuse: z.boolean()
});

/**
 * Zod schema for RuleNode
 */
const RuleNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    levelName: z.string(),
    Type: z.string().optional(),
    Value: z.string().optional(),
    RefId: z.string().optional(),
    rule_refid: z.string().optional(),
    children: z.array(RuleNodeSchema).optional()
  })
);

/**
 * Zod schema for InterpretationTree
 */
const InterpretationTreeSchema = z.object({
  name: z.array(z.string()),
  tree: z.array(RuleNodeSchema),
  properties: z.array(PropertySchema).optional()
});

/**
 * Validate a single interpretation tree
 */
export function validateInterpretationTree(tree: unknown): {
  valid: boolean;
  errors: string[];
  data?: InterpretationTree;
} {
  try {
    const result = InterpretationTreeSchema.safeParse(tree);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        data: result.data as InterpretationTree
      };
    } else {
      return {
        valid: false,
        errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error}`]
    };
  }
}

/**
 * Validate a single evaluation
 */
export function validateEvaluation(evaluation: unknown): {
  valid: boolean;
  errors: string[];
  data?: Evaluation;
} {
  try {
    const result = EvaluationSchema.safeParse(evaluation);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        data: result.data as Evaluation
      };
    } else {
      return {
        valid: false,
        errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error}`]
    };
  }
}

/**
 * Validate a single property
 */
export function validateProperty(property: unknown): {
  valid: boolean;
  errors: string[];
  data?: Property;
} {
  try {
    const result = PropertySchema.safeParse(property);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        data: result.data as Property
      };
    } else {
      return {
        valid: false,
        errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error}`]
    };
  }
}

/**
 * Validate all interpretation trees
 */
export function validateAllInterpretations(trees: unknown[]): {
  valid: boolean;
  totalErrors: number;
  results: Array<{
    index: number;
    name: string;
    valid: boolean;
    errors: string[];
  }>;
} {
  const results = trees.map((tree, index) => {
    const validation = validateInterpretationTree(tree);
    const name = (tree as any).name?.[0] || `Unknown (index ${index})`;
    
    return {
      index,
      name,
      valid: validation.valid,
      errors: validation.errors
    };
  });
  
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  return {
    valid: totalErrors === 0,
    totalErrors,
    results
  };
}

/**
 * Check for common data issues
 */
export function checkDataIntegrity(
  trees: InterpretationTree[],
  evaluations: Evaluation[],
  properties: Property[]
): {
  issues: string[];
  warnings: string[];
  stats: {
    unreferencedEvaluations: number;
    unreferencedProperties: number;
  };
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Get all property names referenced in trees
  const referencedProperties = new Set<string>();
  trees.forEach(tree => {
    tree.properties?.forEach(prop => {
      referencedProperties.add(prop.propname);
    });
  });

  // Check for properties without evaluations
  const propertyNames = new Set(properties.map(p => p.propname));
  const evaluationPropertyNames = new Set(evaluations.map(e => e.propname));
  
  const propertiesWithoutEvaluations = Array.from(propertyNames).filter(
    name => !evaluationPropertyNames.has(name)
  );
  
  if (propertiesWithoutEvaluations.length > 0) {
    warnings.push(
      `${propertiesWithoutEvaluations.length} properties have no evaluations`
    );
  }

  // Count unreferenced data
  const unreferencedProperties = Array.from(propertyNames).filter(
    name => !referencedProperties.has(name)
  ).length;

  const unreferencedEvaluations = evaluations.filter(
    e => !referencedProperties.has(e.propname)
  ).length;

  if (unreferencedProperties > 0) {
    warnings.push(`${unreferencedProperties} properties are not referenced in any interpretation`);
  }

  if (unreferencedEvaluations > 0) {
    warnings.push(`${unreferencedEvaluations} evaluations are not referenced in any interpretation`);
  }

  return {
    issues,
    warnings,
    stats: {
      unreferencedEvaluations,
      unreferencedProperties
    }
  };
}
