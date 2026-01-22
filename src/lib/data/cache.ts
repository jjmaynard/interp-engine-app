/**
 * Caching layer for interpretation engine data
 * Provides in-memory caching to improve performance
 */

import {
  InterpretationTree,
  Evaluation,
  Property
} from '@/types/interpretation';
import {
  loadInterpretationTrees,
  loadEvaluations,
  loadProperties
} from './loader';

/**
 * Cache class for interpretation data
 */
class DataCache {
  private interpretationTreesCache: InterpretationTree[] | null = null;
  private evaluationsCache: Evaluation[] | null = null;
  private propertiesCache: Property[] | null = null;
  private evaluationsByNameCache: Map<string, Evaluation> | null = null;
  private propertiesByNameCache: Map<string, Property> | null = null;
  private lastCacheTime: number = 0;
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Get cached interpretation trees or load them
   */
  getInterpretationTrees(): InterpretationTree[] {
    if (this.shouldRefreshCache()) {
      this.clearCache();
    }
    
    if (!this.interpretationTreesCache) {
      this.interpretationTreesCache = loadInterpretationTrees();
      this.lastCacheTime = Date.now();
    }
    
    return this.interpretationTreesCache;
  }

  /**
   * Get cached evaluations or load them
   */
  getEvaluations(): Evaluation[] {
    if (this.shouldRefreshCache()) {
      this.clearCache();
    }
    
    if (!this.evaluationsCache) {
      this.evaluationsCache = loadEvaluations();
      this.lastCacheTime = Date.now();
    }
    
    return this.evaluationsCache;
  }

  /**
   * Get cached properties or load them
   */
  getProperties(): Property[] {
    if (this.shouldRefreshCache()) {
      this.clearCache();
    }
    
    if (!this.propertiesCache) {
      this.propertiesCache = loadProperties();
      this.lastCacheTime = Date.now();
    }
    
    return this.propertiesCache;
  }

  /**
   * Get evaluation by name with caching
   */
  getEvaluationByName(name: string): Evaluation | null {
    if (!this.evaluationsByNameCache) {
      const evaluations = this.getEvaluations();
      this.evaluationsByNameCache = new Map(
        evaluations.map(e => [e.evalname, e])
      );
    }
    
    return this.evaluationsByNameCache.get(name) || null;
  }

  /**
   * Get property by name with caching
   */
  getPropertyByName(name: string): Property | null {
    if (!this.propertiesByNameCache) {
      const properties = this.getProperties();
      this.propertiesByNameCache = new Map(
        properties.map(p => [p.propname, p])
      );
    }
    
    return this.propertiesByNameCache.get(name) || null;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.interpretationTreesCache = null;
    this.evaluationsCache = null;
    this.propertiesCache = null;
    this.evaluationsByNameCache = null;
    this.propertiesByNameCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Check if cache should be refreshed
   */
  private shouldRefreshCache(): boolean {
    if (this.lastCacheTime === 0) return false;
    return Date.now() - this.lastCacheTime > this.cacheTTL;
  }

  /**
   * Set cache TTL (time to live in milliseconds)
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      isCached: {
        interpretations: this.interpretationTreesCache !== null,
        evaluations: this.evaluationsCache !== null,
        properties: this.propertiesCache !== null
      },
      lastCacheTime: this.lastCacheTime,
      cacheTTL: this.cacheTTL,
      cacheAge: this.lastCacheTime > 0 ? Date.now() - this.lastCacheTime : 0
    };
  }
}

// Export singleton instance
export const dataCache = new DataCache();
