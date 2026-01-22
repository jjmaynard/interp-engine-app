/**
 * API Client for Interpretation Engine
 * 
 * Type-safe client for making requests to the interpretation engine API
 */

import type { InterpretationResult, Property } from '@/types/interpretation';
import type { PropertyData } from '@/lib/engine/evaluator';

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: any;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
}

/**
 * Interpretation Engine API Client
 */
export class InterpretationApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make API request with timeout
   * 
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Response data
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Request failed',
        };
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  /**
   * Evaluate an interpretation
   * 
   * @param interpretationName - Name of interpretation
   * @param propertyData - Property values
   * @returns Evaluation result
   */
  async evaluate(
    interpretationName: string,
    propertyData: PropertyData
  ): Promise<ApiResponse<InterpretationResult>> {
    return this.request<InterpretationResult>(
      `${this.baseUrl}/interpret`,
      {
        method: 'POST',
        body: JSON.stringify({
          interpretationName,
          propertyData,
        }),
      }
    );
  }

  /**
   * Batch evaluate an interpretation
   * 
   * @param interpretationName - Name of interpretation
   * @param propertyDataArray - Array of property values
   * @returns Array of evaluation results
   */
  async batchEvaluate(
    interpretationName: string,
    propertyDataArray: PropertyData[]
  ): Promise<ApiResponse<InterpretationResult[]>> {
    return this.request<InterpretationResult[]>(
      `${this.baseUrl}/interpret/batch`,
      {
        method: 'POST',
        body: JSON.stringify({
          interpretationName,
          propertyDataArray,
        }),
      }
    );
  }

  /**
   * Get all available interpretations
   * 
   * @returns List of interpretations
   */
  async getInterpretations(): Promise<
    ApiResponse<Array<{ name: string; propertyCount: number }>>
  > {
    return this.request(
      `${this.baseUrl}/interpret`,
      { method: 'GET' }
    );
  }

  /**
   * Get required properties for an interpretation
   * 
   * @param interpretationName - Name of interpretation
   * @returns List of required properties
   */
  async getRequiredProperties(
    interpretationName: string
  ): Promise<ApiResponse<Property[]>> {
    const encodedName = encodeURIComponent(interpretationName);
    return this.request<Property[]>(
      `${this.baseUrl}/interpret/${encodedName}/properties`,
      { method: 'GET' }
    );
  }

  /**
   * Check API health
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request(
      `${this.baseUrl}/health`,
      { method: 'GET' }
    );
  }
}

/**
 * Create a new API client instance
 * 
 * @param config - Client configuration
 * @returns API client
 */
export function createApiClient(config?: ApiClientConfig): InterpretationApiClient {
  return new InterpretationApiClient(config);
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient();
