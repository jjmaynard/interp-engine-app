/**
 * Input Validation for Interpretation Engine
 * 
 * Zod schemas and validation functions for API requests
 */

import { z } from 'zod';
import type { PropertyData } from '@/lib/engine/evaluator';

/**
 * Schema for property data values
 */
export const PropertyValueSchema = z.union([
  z.number(),
  z.string(),
  z.null(),
  z.undefined(),
]);

/**
 * Schema for property data object
 */
export const PropertyDataSchema = z.record(
  z.string(),
  PropertyValueSchema
);

/**
 * Schema for single interpretation request
 */
export const InterpretRequestSchema = z.object({
  interpretationName: z.string().min(1, 'Interpretation name is required'),
  propertyData: PropertyDataSchema,
  debug: z.boolean().optional(),
});

/**
 * Schema for batch interpretation request
 */
export const BatchInterpretRequestSchema = z.object({
  interpretationName: z.string().min(1, 'Interpretation name is required'),
  propertyDataArray: z.array(PropertyDataSchema)
    .min(1, 'At least one property data record is required')
    .max(1000, 'Maximum batch size is 1000 records'),
  debug: z.boolean().optional(),
});

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate interpretation request
 * 
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateInterpretRequest(
  data: unknown
): ValidationResult<z.infer<typeof InterpretRequestSchema>> {
  try {
    const result = InterpretRequestSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ),
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Validation error: ' + (error instanceof Error ? error.message : 'Unknown error')],
    };
  }
}

/**
 * Validate batch interpretation request
 * 
 * @param data - Request data to validate
 * @returns Validation result
 */
export function validateBatchInterpretRequest(
  data: unknown
): ValidationResult<z.infer<typeof BatchInterpretRequestSchema>> {
  try {
    const result = BatchInterpretRequestSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ),
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Validation error: ' + (error instanceof Error ? error.message : 'Unknown error')],
    };
  }
}

/**
 * Validate property data has all required properties
 * 
 * @param propertyData - Property data to validate
 * @param requiredProperties - List of required property names
 * @returns Validation result
 */
export function validateRequiredProperties(
  propertyData: PropertyData,
  requiredProperties: string[]
): ValidationResult<PropertyData> {
  const missingProperties: string[] = [];
  const invalidProperties: string[] = [];

  for (const propName of requiredProperties) {
    if (!(propName in propertyData)) {
      missingProperties.push(propName);
    } else {
      const value = propertyData[propName];
      if (value !== null && value !== undefined && typeof value !== 'number' && typeof value !== 'string') {
        invalidProperties.push(propName);
      }
    }
  }

  if (missingProperties.length > 0 || invalidProperties.length > 0) {
    const errors: string[] = [];
    
    if (missingProperties.length > 0) {
      errors.push(`Missing required properties: ${missingProperties.join(', ')}`);
    }
    
    if (invalidProperties.length > 0) {
      errors.push(`Invalid property values: ${invalidProperties.join(', ')}`);
    }

    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: propertyData,
  };
}

/**
 * Sanitize property data by removing undefined values
 * 
 * @param propertyData - Property data to sanitize
 * @returns Sanitized property data
 */
export function sanitizePropertyData(propertyData: PropertyData): PropertyData {
  const sanitized: PropertyData = {};

  for (const [key, value] of Object.entries(propertyData)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate interpretation name format
 * 
 * @param name - Interpretation name
 * @returns True if valid
 */
export function isValidInterpretationName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length < 500;
}
