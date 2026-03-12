// ============================================================================
// GEE API v2.1.0 Client - Unified Endpoint Architecture
// ============================================================================
// Complete client for Google Earth Engine API with RUSLE calculations,
// CSB field boundaries, terrain analysis, NDVI, drought assessment, and more.
// Reference: Property_Panel_Guide/gee-api-docs/nextjs-erosion-module/

import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  RUSLECalculateRequest,
  RUSLEResponse,
  RFactorRequest,
  RFactorResponse,
  LSFactorRequest,
  LSFactorResponse,
  CSBBounds,
  CSBFieldDetails,
  CSBQueryParams,
  CSBTileUrlRequest,
  CSBTileUrlResponse,
  TerrainRequest,
  TerrainResponse,
  SentinelRequest,
  SentinelResponse,
  ClimateRequest,
  ClimateResponse,
  DroughtAssessmentRequest,
  DroughtAssessment,
  ResourceConcernRequest,
  ComprehensiveAssessment,
  ErosionAssessment,
  PondingAssessment,
  ProductivityAssessment,
  ComprehensiveFieldAssessment,
  ComprehensiveAssessmentRequest,
} from '@/types/geeApi'

// ============================================================================
// Configuration
// ============================================================================

export interface GEEClientConfig {
  baseURL?: string
  timeout?: number
}

// ============================================================================
// Error Handling
// ============================================================================

export class GEEAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'GEEAPIError'
  }
}

function handleAPIError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data
    
    // Log full error details for debugging
    console.error('[GEE API Error]:', data)
    
    // Extract error message
    let message = 'API request failed'
    
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI validation errors
        message = data.detail.map((err: any) => 
          `${err.loc?.join('.') || 'Field'}: ${err.msg}`
        ).join('; ')
      } else if (typeof data.detail === 'string') {
        message = data.detail
      } else {
        message = JSON.stringify(data.detail)
      }
    } else if (error.message) {
      message = error.message
    }
    
    throw new GEEAPIError(message, status, data)
  }
  throw new GEEAPIError('An unexpected error occurred')
}

// ============================================================================
// Main API Client
// ============================================================================

class GEEAPIClient {
  private client: AxiosInstance
  private fieldDetailsCache: Map<string, { data: CSBFieldDetails; timestamp: number }> = new Map()
  private boundsCache: Map<string, { data: CSBBounds; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(config: GEEClientConfig = {}) {
    // Use local Next.js API routes as proxy to avoid CORS issues
    const baseURL = config.baseURL || 
      (typeof window !== 'undefined' ? '/api/gee' : 
        process.env.NEXT_PUBLIC_GEE_API_URL || 
        'https://gee-api-production.up.railway.app')
    
    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 150000, // 150s for multi-scenario RUSLE processing
      headers: { 'Content-Type': 'application/json' },
    })

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      console.log(`[GEE API] ${config.method?.toUpperCase()} ${config.url}`)
      return config
    })

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[GEE API Error]:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  // ==========================================================================
  // RUSLE v2.1.0 - Unified Endpoint (PRIMARY METHOD)
  // ==========================================================================

  /**
   * Calculate complete RUSLE analysis with all factors and statistics
   * This is the RECOMMENDED method - replaces old multi-endpoint approach
   * 
   * @param request - RUSLE calculation parameters including geometry and dates
   * @returns Complete RUSLE response with spatial statistics for all factors
   */
  async calculateRUSLE(request: RUSLECalculateRequest): Promise<RUSLEResponse> {
    try {
      // Log the request as-is (year should already be a number from frontend)
      console.log('[GEE API] Sending request:', {
        year: request.year,
        yearType: typeof request.year,
        startDate: request.start_date,
        endDate: request.end_date,
        wktLength: request.wkt?.length || 0,
        practices: request.conservation_practices,
        detectTerraces: request.detect_terraces,
        detectContours: request.detect_contours,
        includeScenarios: request.include_scenarios,
        includeFactorMaps: request.include_factor_maps,
        includeUncertainty: request.include_uncertainty,
        includeEvents: request.include_events,
      })
      
      const { data } = await this.client.post<RUSLEResponse>(
        '/api/rusle/calculate',
        request  // Send as-is, backend will validate
      )
      
      console.log('[GEE API] Success! Received response with soil_loss_rate:', data.soil_loss_rate_tons_acre_yr)
      
      return data
    } catch (error) {
      console.error('[GEE API] Request failed. Error details:', {
        message: (error as any)?.message,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      })
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Individual Factor Endpoints (Optional - for specialized use)
  // ==========================================================================

  async getRFactor(request: RFactorRequest): Promise<RFactorResponse> {
    try {
      const { data } = await this.client.post<RFactorResponse>(
        '/api/rusle/r-factor',
        request
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getLSFactor(request: LSFactorRequest): Promise<LSFactorResponse> {
    try {
      const { data } = await this.client.post<LSFactorResponse>(
        '/api/rusle/ls-factor',
        request
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Drought Assessment (GRIDMET)
  // ==========================================================================

  async getDroughtAssessment(request: DroughtAssessmentRequest): Promise<DroughtAssessment> {
    try {
      const params = new URLSearchParams()
      params.append('wkt', request.wkt)
      if (request.date) params.append('date', request.date)
      if (request.soil_awc) params.append('soil_awc', request.soil_awc.toString())
      if (request.soil_texture) params.append('soil_texture', request.soil_texture)
      params.append('include_technical', request.include_technical?.toString() || 'false')
      params.append('auto_adjust_date', request.auto_adjust_date?.toString() || 'true')

      const { data } = await this.client.post<DroughtAssessment>(
        `/api/climate/drought-assessment?${params}`
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Resource Concerns
  // ==========================================================================

  async getResourceConcernAssessment(
    request: ResourceConcernRequest
  ): Promise<ComprehensiveAssessment> {
    try {
      const params = new URLSearchParams()
      if (request.year) params.append('year', request.year.toString())
      if (request.include_geojson !== undefined) {
        params.append('include_geojson', request.include_geojson.toString())
      }

      const { data } = await this.client.post<ComprehensiveAssessment>(
        `/api/resource-concerns/comprehensive?${params}`,
        { wkt: request.wkt }
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getErosionConcern(wkt: string, year?: number): Promise<ErosionAssessment> {
    try {
      const params = year ? `?year=${year}` : ''
      const { data } = await this.client.post<ErosionAssessment>(
        `/api/resource-concerns/erosion${params}`,
        { wkt }
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getPondingConcern(wkt: string): Promise<PondingAssessment> {
    try {
      const { data } = await this.client.post<PondingAssessment>(
        '/api/resource-concerns/ponding',
        { wkt }
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getProductivityConcern(wkt: string, year?: number): Promise<ProductivityAssessment> {
    try {
      const params = year ? `?year=${year}` : ''
      const { data } = await this.client.post<ProductivityAssessment>(
        `/api/resource-concerns/productivity${params}`,
        { wkt }
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // CSB (Common Land Unit) Endpoints
  // ==========================================================================

  /**
   * Get CSB tile URL template from API
   */
  async getCSBTileURL(options: CSBTileUrlRequest = {}): Promise<CSBTileUrlResponse> {
    try {
      const { data } = await this.client.get<CSBTileUrlResponse>('/api/csb/tiles', {
        params: {
          opacity: options.opacity || 0.7,
          min_complexity: options.min_complexity || 1,
          max_complexity: options.max_complexity || 4,
        },
      })
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  /**
   * Get CSB field boundaries within a bounding box
   */
  async getCSBBounds(params: CSBQueryParams): Promise<CSBBounds> {
    // Use the limit parameter with 1000 as default (API default)
    const limit = params.limit || 1000
    
    // Create cache key from bounds parameters
    const cacheKey = `${params.minLon.toFixed(4)},${params.minLat.toFixed(4)},${params.maxLon.toFixed(4)},${params.maxLat.toFixed(4)},${limit}`
    
    // Check cache first
    const cached = this.boundsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[GEE API] Returning cached bounds data')
      return cached.data
    }
    
    const maxRetries = 3
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GEE API] Fetching CSB bounds (attempt ${attempt}/${maxRetries}) with limit ${limit}...`)
        
        const response = await this.client.get<CSBBounds>('/api/csb/bounds', {
          params: {
            min_lon: params.minLon,
            min_lat: params.minLat,
            max_lon: params.maxLon,
            max_lat: params.maxLat,
            zoom: params.zoom,
            limit: limit,
          },
          timeout: 60000, // 60 second timeout
        })
        
        console.log(`[GEE API] Successfully fetched ${response.data.features?.length || 0} field boundaries`)
        
        // Cache the result
        this.boundsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        })
        
        return response.data
      } catch (error) {
        lastError = error
        console.warn(`[GEE API] Attempt ${attempt} failed:`, (error as any)?.message)
        
        // Don't retry on 4xx errors (client errors)
        const status = (error as any)?.response?.status
        if (status && status >= 400 && status < 500) {
          console.error('[GEE API] Client error, not retrying')
          return handleAPIError(error)
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`[GEE API] Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    console.error('[GEE API] All retry attempts failed')
    return handleAPIError(lastError)
  }

  /**
   * Get detailed field information for a specific CSB ID
   */
  async getFieldDetails(csbid: string): Promise<CSBFieldDetails> {
    try {
      // Check cache first
      const cached = this.fieldDetailsCache.get(csbid)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('[GEE API] Returning cached field details for:', csbid)
        return cached.data
      }

      const response = await this.client.get<any>(
        `/api/csb/field/${csbid}`,
        { timeout: 10000 } // 10 second timeout for field details
      )
      
      console.log('[GEE API] Raw field details response:', response.data)
      
      // Transform API response to match our interface
      // Backend returns field_id, we use clu_id
      // Properties may be uppercase (ACRES, STATE, etc.)
      const data = response.data
      const props = data.properties || {}
      
      const transformedData: CSBFieldDetails = {
        clu_id: data.field_id || data.clu_id || csbid,
        acres: props.ACRES || props.acres || data.acres || 0,
        state: props.STATE || props.STATEFIPS || props.state || data.state || '',
        county: props.COUNTY || props.CNTY || props.county || data.county || '',
        farm_number: props.FARM_NUMBER || props.farm_number || data.farm_number,
        tract_number: props.TRACT_NUMBER || props.tract_number || data.tract_number,
        field_number: props.FIELD_NUMBER || props.field_number || data.field_number,
        geometry: data.geometry,
        centroid: data.centroid || { lat: 0, lng: 0 },
        properties: data.properties,
        rotation_analysis: data.rotation_analysis,
        crop_names: data.crop_names,
        sustainability_metrics: data.sustainability_metrics,
      }
      
      // Cache the result
      this.fieldDetailsCache.set(csbid, {
        data: transformedData,
        timestamp: Date.now()
      })
      
      return transformedData
    } catch (error) {
      return handleAPIError(error)
    }
  }

  /**
   * Query CSB field at a specific point (for click handlers)
   * Creates a small bounding box around the point
   */
  async queryFieldAtPoint(lat: number, lng: number): Promise<CSBFieldDetails | null> {
    try {
      // Create small bounding box (approx 100m at mid-latitudes)
      const buffer = 0.001 // ~111m
      const bounds = await this.getCSBBounds({
        minLon: lng - buffer,
        minLat: lat - buffer,
        maxLon: lng + buffer,
        maxLat: lat + buffer,
        limit: 1,
      })

      if (bounds.features.length === 0) {
        return null
      }

      // Get the first (nearest) field from bounds
      const feature = bounds.features[0]
      console.log('[GEE API] Raw feature from bounds:', feature)
      console.log('[GEE API] Feature properties:', feature.properties)

      // Handle both uppercase (legacy) and lowercase property names from backend
      const props = feature.properties as any
      const featureAny = feature as any
      const fieldId = props.clu_id || props.CSBID || props.CLU_ID || featureAny.id
      
      // Build basic field info from bounds response
      const basicFieldInfo = {
        clu_id: fieldId || 'unknown',
        acres: props.acres || props.CSBACRES || props.ACRES || 0,
        state: props.state || props.STATEFIPS || props.STATE || '',
        county: props.county || props.CNTY || props.COUNTY || '',
        farm_number: props.farm_number || props.FARM_NUMBER,
        tract_number: props.tract_number || props.TRACT_NUMBER,
        field_number: props.field_number || props.FIELD_NUMBER,
        geometry: feature.geometry,
        centroid: {
          lat: lat,
          lng: lng,
        },
      }
      
      // If we have a field ID, get detailed info including rotation analysis
      if (fieldId && fieldId !== 'unknown') {
        try {
          console.log('[GEE API] Fetching detailed field data for:', fieldId)
          
          // Set a shorter timeout for field details to avoid long waits
          const detailedFieldPromise = this.getFieldDetails(fieldId)
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 5000) // 5 second max wait
          )
          
          const detailedField = await Promise.race([detailedFieldPromise, timeoutPromise])
          
          if (detailedField) {
            console.log('[GEE API] Received detailed field data:', detailedField)
            
            // Merge basic info with detailed rotation data
            return {
              ...basicFieldInfo,
              ...detailedField,
              // Ensure basic properties aren't overwritten with undefined
              clu_id: detailedField.clu_id || basicFieldInfo.clu_id,
              acres: detailedField.acres ?? basicFieldInfo.acres,
              state: detailedField.state || basicFieldInfo.state,
              county: detailedField.county || basicFieldInfo.county,
              geometry: detailedField.geometry || basicFieldInfo.geometry,
            }
          } else {
            console.warn('[GEE API] Field details fetch timed out, using basic info')
          }
        } catch (error) {
          console.warn('[GEE API] Failed to get detailed field data, using basic info:', error)
          // Fall back to basic info if detailed fetch fails
        }
      }
      
      // Fallback: return basic field info from bounds
      return basicFieldInfo
    } catch (error) {
      console.error('Error querying field at point:', error)
      return null
    }
  }

  // ==========================================================================
  // Terrain Analysis
  // ==========================================================================

  async getTerrainAnalysis(request: TerrainRequest): Promise<TerrainResponse> {
    try {
      const { data } = await this.client.post<TerrainResponse>(
        '/api/terrain/polygon',
        request
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Vegetation / Sentinel-2 NDVI
  // ==========================================================================

  async getSentinelNDVI(request: SentinelRequest): Promise<SentinelResponse> {
    try {
      const { data } = await this.client.post<SentinelResponse>(
        '/api/sentinel/polygon',
        request
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getSentinelPointNDVI(
    lat: number,
    lon: number,
    start_date: string,
    end_date: string
  ): Promise<SentinelResponse> {
    try {
      const { data } = await this.client.get<SentinelResponse>('/api/sentinel/point', {
        params: { lat, lon, start_date, end_date },
      })
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Climate Data
  // ==========================================================================

  async getClimateAnalysis(request: ClimateRequest): Promise<ClimateResponse> {
    try {
      const { data } = await this.client.post<ClimateResponse>(
        '/api/climate/polygon',
        request
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async getClimatePoint(
    lat: number,
    lon: number,
    start_year: number,
    end_year: number
  ): Promise<ClimateResponse> {
    try {
      const { data } = await this.client.get<ClimateResponse>('/api/climate/point', {
        params: { lat, lon, start_year, end_year },
      })
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Comprehensive Field Assessment
  // ==========================================================================

  /**
   * Get comprehensive field assessment with all resource concerns
   * @param request - WKT geometry and optional parameters
   * @returns Complete assessment with erosion, ponding, drought, productivity, SVI
   */
  async getComprehensiveAssessment(
    request: ComprehensiveAssessmentRequest
  ): Promise<ComprehensiveFieldAssessment> {
    try {
      const body: any = {
        wkt: request.wkt,
        year: request.year || new Date().getFullYear()
      }
      
      if (request.include_visualizations !== undefined) {
        body.include_visualizations = request.include_visualizations
      }

      const { data } = await this.client.post<ComprehensiveFieldAssessment>(
        `/api/assessment/all`,
        body
      )
      return data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health')
      return response.data
    } catch (error) {
      throw new Error('GEE API is not available')
    }
  }
}

// ============================================================================
// Factory Function (v2.1.0 Pattern)
// ============================================================================

/**
 * Create a new GEE API client instance
 * @param config - Optional configuration (baseURL, timeout)
 * @returns GEEAPIClient instance
 */
export function createGEEClient(config?: GEEClientConfig): GEEAPIClient {
  return new GEEAPIClient(config)
}

// Export singleton for convenience
export const geeApi = createGEEClient()
