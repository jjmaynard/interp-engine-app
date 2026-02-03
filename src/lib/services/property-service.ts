/**
 * Property Service Client
 * 
 * Client for communicating with the Python Property Service
 * that calculates soil properties from NRCS Soil Data Access API
 */

import { PropertyServiceError } from '@/lib/errors/PropertyServiceError';

/**
 * Configuration for PropertyServiceClient
 */
export interface PropertyServiceConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
  retries?: number;
}

/**
 * Request to calculate properties
 */
export interface PropertyCalculationRequest {
  mukey: string;
  property_ids: number[];
  query_strategy?: 'individual' | 'consolidated' | 'auto';
}

/**
 * Individual property value result
 */
export interface PropertyValue {
  value: number | string | null;
  low?: number | null;
  high?: number | null;
  unit?: string | null;
  method?: string;
  source?: string;
}

/**
 * Property calculation response
 */
export interface PropertyCalculationResult {
  success: boolean;
  values: Record<number, PropertyValue>;
  metadata?: {
    mukey?: string;
    total_properties?: number;
    query_count?: number;
    cache_hits?: number;
    cache_misses?: number;
    consolidation_groups?: number;
    query_reduction_percent?: number;
    execution_time_ms?: number;
  };
  error?: string;
}

/**
 * Available property metadata
 */
export interface PropertyMetadata {
  propiid: number;
  propname: string;
  propuom: string | null;
  propdesc: string;
  has_sql: boolean;
  aggregation_type?: string;
  consolidation_key?: string;
}

/**
 * Service health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp?: string;
  uptime_seconds?: number;
  data?: {
    properties_loaded?: number;
    consolidation_groups?: number;
  };
}

/**
 * Client for the Python Property Service
 */
export class PropertyServiceClient {
  private baseUrl: string;
  private timeout: number;
  private apiKey?: string;
  private retries: number;

  constructor(config: PropertyServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 second default
    this.apiKey = config.apiKey;
    this.retries = config.retries || 2;
  }

  /**
   * Calculate soil properties for a MUKEY
   */
  async calculateProperties(
    mukey: string,
    propertyIds: number[],
    queryStrategy: 'individual' | 'consolidated' | 'auto' = 'auto'
  ): Promise<PropertyCalculationResult> {
    const request: PropertyCalculationRequest = {
      mukey,
      property_ids: propertyIds,
      query_strategy: queryStrategy,
    };

    return this.request<PropertyCalculationResult>(
      '/properties/calculate',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Get list of available properties
   */
  async getAvailableProperties(): Promise<PropertyMetadata[]> {
    const response = await this.request<{ properties: PropertyMetadata[] }>(
      '/properties/available'
    );
    return response.properties;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      return await this.request<HealthStatus>('/health', {
        // Use shorter timeout for health checks
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Make HTTP request to property service with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new PropertyServiceError(
          `Property service error (${response.status}): ${errorText}`,
          response.status,
          { endpoint, attempt }
        );
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      clearTimeout(timeoutId);

      // Retry logic for network errors or timeouts
      if (attempt < this.retries && this.isRetryableError(error)) {
        console.warn(
          `Property service request failed (attempt ${attempt + 1}/${this.retries + 1}), retrying...`,
          error
        );
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return this.request<T>(endpoint, options, attempt + 1);
      }

      // Convert to PropertyServiceError if not already
      if (error instanceof PropertyServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new PropertyServiceError(
          `Request timeout after ${this.timeout}ms`,
          408,
          { endpoint, timeout: this.timeout }
        );
      }

      throw new PropertyServiceError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        { endpoint, originalError: error }
      );
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof PropertyServiceError) {
      // Retry on 5xx errors and 408 (timeout)
      return error.statusCode >= 500 || error.statusCode === 408;
    }

    // Retry on network errors
    if (error instanceof Error) {
      return (
        error.name === 'TypeError' || // Network error
        error.name === 'AbortError'   // Timeout
      );
    }

    return false;
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for property service client
 * Configured from environment variables
 */
export const propertyService = new PropertyServiceClient({
  baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000'),
  apiKey: process.env.PYTHON_SERVICE_API_KEY,
  retries: 2,
});
