// CSB Field Selection Client - Simplified for field selection module

import axios, { AxiosInstance } from 'axios'

// ============================================================================
// Types
// ============================================================================

export interface CSBQueryParams {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
  zoom?: number
  limit?: number
}

export interface CSBTileUrlRequest {
  opacity?: number
  min_complexity?: number
  max_complexity?: number
}

export interface CSBTileUrlResponse {
  tile_url: string
  opacity: number
  min_complexity: number
  max_complexity: number
}

export interface CSBBounds {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id?: string | number
    geometry: {
      type: 'Polygon'
      coordinates: number[][][]
    }
    properties: {
      [key: string]: any
    }
  }>
}

export interface CSBFieldDetails {
  clu_id: string
  acres: number
  state: string
  county: string
  farm_number?: string
  tract_number?: string
  field_number?: string
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  centroid: {
    lat: number
    lng: number
  }
  properties?: {
    [key: string]: any
  }
  rotation_analysis?: {
    pattern_type: string
    unique_crops: number
    [key: string]: any
  }
  crop_names?: {
    [year: string]: string
  }
  sustainability_metrics?: {
    total_score: number
    rating: string
    has_cover_crops: boolean
    has_nitrogen_fixers: boolean
    cover_crop_bonus: number
    nitrogen_fixation_bonus: number
    [key: string]: any
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class CSBAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'CSBAPIError'
  }
}

function handleAPIError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data
    
    let message = 'API request failed'
    
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        message = data.detail.map((err: any) => 
          `${err.loc?.join('.') || 'Field'}: ${err.msg}`
        ).join('; ')
      } else if (typeof data.detail === 'string') {
        message = data.detail
      }
    } else if (error.message) {
      message = error.message
    }
    
    throw new CSBAPIError(message, status, data)
  }
  throw new CSBAPIError('An unexpected error occurred')
}

// ============================================================================
// CSB API Client
// ============================================================================

class CSBAPIClient {
  private client: AxiosInstance
  private fieldDetailsCache: Map<string, { data: CSBFieldDetails; timestamp: number }> = new Map()
  private boundsCache: Map<string, { data: CSBBounds; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(baseURL?: string) {
    // In the browser, always use same-origin Next.js proxy routes to avoid CORS.
    // Server-side callers may still provide/consume an absolute base URL.
    const apiURL =
      baseURL ?? (typeof window === 'undefined' ? process.env.NEXT_PUBLIC_CSB_API_BASE_URL || '' : '')
    
    this.client = axios.create({
      baseURL: apiURL,
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
    const limit = params.limit || 1000
    const cacheKey = `${params.minLon.toFixed(4)},${params.minLat.toFixed(4)},${params.maxLon.toFixed(4)},${params.maxLat.toFixed(4)},${limit}`
    
    const cached = this.boundsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    
    const maxRetries = 3
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.get<CSBBounds>('/api/csb/bounds', {
          params: {
            min_lon: params.minLon,
            min_lat: params.minLat,
            max_lon: params.maxLon,
            max_lat: params.maxLat,
            zoom: params.zoom,
            limit: limit,
          },
          timeout: 60000,
        })
        
        this.boundsCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        })
        
        return response.data
      } catch (error) {
        lastError = error
        
        const status = (error as any)?.response?.status
        if (status && status >= 400 && status < 500) {
          return handleAPIError(error)
        }
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    return handleAPIError(lastError)
  }

  /**
   * Get detailed field information for a specific CSB ID
   */
  async getFieldDetails(csbid: string): Promise<CSBFieldDetails> {
    try {
      const cached = this.fieldDetailsCache.get(csbid)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data
      }

      const response = await this.client.get<any>(
        `/api/csb/field/${csbid}`,
        { timeout: 10000 }
      )
      
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
   */
  async queryFieldAtPoint(lat: number, lng: number): Promise<CSBFieldDetails | null> {
    try {
      const buffer = 0.001
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

      const feature = bounds.features[0]
      const props = feature.properties as any
      const featureAny = feature as any
      const fieldId = props.clu_id || props.CSBID || props.CLU_ID || featureAny.id
      
      const basicFieldInfo = {
        clu_id: fieldId || 'unknown',
        acres: props.acres || props.CSBACRES || props.ACRES || 0,
        state: props.state || props.STATEFIPS || props.STATE || '',
        county: props.county || props.CNTY || props.COUNTY || '',
        farm_number: props.farm_number || props.FARM_NUMBER,
        tract_number: props.tract_number || props.TRACT_NUMBER,
        field_number: props.field_number || props.FIELD_NUMBER,
        geometry: feature.geometry,
        centroid: { lat, lng },
      }
      
      if (fieldId && fieldId !== 'unknown') {
        try {
          const detailedFieldPromise = this.getFieldDetails(fieldId)
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 5000)
          )
          
          const detailedField = await Promise.race([detailedFieldPromise, timeoutPromise])
          
          if (detailedField) {
            return {
              ...basicFieldInfo,
              ...detailedField,
              centroid: basicFieldInfo.centroid,
            }
          }
        } catch (error) {
          console.warn('Failed to fetch detailed field info, using basic info:', error)
        }
      }
      
      return basicFieldInfo as CSBFieldDetails
    } catch (error) {
      return handleAPIError(error)
    }
  }
}

// Export singleton instance
export const geeApi = new CSBAPIClient()
