/**
 * Result Caching System
 * 
 * In-memory cache for interpretation evaluation results
 * Uses LRU (Least Recently Used) eviction policy
 */

import type { InterpretationResult } from '@/types/interpretation';
import type { PropertyData } from '@/lib/engine/evaluator';

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  result: InterpretationResult;
  timestamp: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * Result cache configuration
 */
export interface ResultCacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Generate cache key from interpretation name and property data
 * 
 * @param interpretationName - Interpretation name
 * @param propertyData - Property data
 * @returns Cache key
 */
function generateCacheKey(
  interpretationName: string,
  propertyData: PropertyData
): string {
  // Sort keys for consistent hashing
  const sortedKeys = Object.keys(propertyData).sort();
  const sortedData: Record<string, any> = {};
  
  for (const key of sortedKeys) {
    sortedData[key] = propertyData[key];
  }

  return `${interpretationName}:${JSON.stringify(sortedData)}`;
}

/**
 * Result cache using LRU eviction
 */
export class ResultCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(config: ResultCacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.ttl = config.ttl || 1000 * 60 * 30; // Default 30 minutes
  }

  /**
   * Get result from cache
   * 
   * @param interpretationName - Interpretation name
   * @param propertyData - Property data
   * @returns Cached result or null
   */
  get(
    interpretationName: string,
    propertyData: PropertyData
  ): InterpretationResult | null {
    const key = generateCacheKey(interpretationName, propertyData);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update hits and move to end (LRU)
    entry.hits++;
    this.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  /**
   * Set result in cache
   * 
   * @param interpretationName - Interpretation name
   * @param propertyData - Property data
   * @param result - Evaluation result
   */
  set(
    interpretationName: string,
    propertyData: PropertyData,
    result: InterpretationResult
  ): void {
    const key = generateCacheKey(interpretationName, propertyData);

    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.evictions++;
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getStats(): CacheStatistics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: parseFloat(hitRate.toFixed(4)),
      evictions: this.evictions,
    };
  }

  /**
   * Set TTL for cache entries
   * 
   * @param ttl - Time to live in milliseconds
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  /**
   * Set max cache size
   * 
   * @param maxSize - Maximum number of entries
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;

    // Evict entries if current size exceeds new max
    while (this.cache.size > maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.evictions++;
      }
    }
  }

  /**
   * Get cache size
   * 
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   * 
   * @param interpretationName - Interpretation name
   * @param propertyData - Property data
   * @returns True if cached
   */
  has(interpretationName: string, propertyData: PropertyData): boolean {
    const key = generateCacheKey(interpretationName, propertyData);
    return this.cache.has(key);
  }
}

/**
 * Singleton result cache instance
 */
let resultCacheInstance: ResultCache | null = null;

/**
 * Get the singleton result cache instance
 * 
 * @param config - Optional configuration
 * @returns Result cache instance
 */
export function getResultCache(config?: ResultCacheConfig): ResultCache {
  if (!resultCacheInstance) {
    resultCacheInstance = new ResultCache(config);
  }
  return resultCacheInstance;
}

/**
 * Reset the result cache instance
 */
export function resetResultCache(): void {
  resultCacheInstance = null;
}
