// ============================================================================
// GEE API v2.1.0 Type Definitions
// ============================================================================
// Complete type definitions for GEE API unified endpoint architecture
// Reference: Property_Panel_Guide/gee-api-docs/nextjs-erosion-module/src/lib/gee-client/types.ts

// ============================================================================
// Core RUSLE Types (v2.1.0 Unified Endpoint)
// ============================================================================

// Multi-scenario result for individual conservation practices
export interface ScenarioResult {
  practice: 'none' | 'contour_farming' | 'strip_cropping' | 'terracing' | 'grassed_waterway' | 'cover_crop'
  soil_loss_rate: number // t/ha/yr
  soil_loss_rate_tons_acre_yr: number
  p_factor: PFactorResponse
  erosion_reduction_percent: number | null
  erosion_class: string
  erosion_class_description: string
}

export interface RUSLECalculateRequest {
  wkt: string // WKT string (REQUIRED)
  start_date: string // ISO format YYYY-MM-DD
  end_date: string
  year?: number // Assessment year (default: 2023)
  
  // NEW: Multi-scenario analysis
  include_scenarios?: boolean // Enable multi-scenario calculation (default: false)
  scenario_practices?: ('none' | 'contour_farming' | 'strip_cropping' | 'terracing' | 'grassed_waterway' | 'cover_crop')[] // Custom practice list (null = all 6)
  
  // Factor calculation tiers
  r_method?: 'hybrid_daymet_gpm' | 'modified_fournier' | 'prism_direct'
  use_multiyear_r_factor?: boolean // Use 15-year climatology (default: true)
  ls_tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4'
  c_tier?: 'tier_1' | 'tier_2' | 'tier_3'
  
  // Crop/vegetation parameters
  crop_type?: string
  tillage_type?: string
  
  // Conservation practices (P-factor)
  conservation_practices?: ('none' | 'contour_farming' | 'strip_cropping' | 'terracing' | 'grassed_waterway' | 'cover_crop')[]
  detect_terraces?: boolean
  detect_contours?: boolean
  detect_buffer_strips?: boolean
  use_high_res_dem?: boolean
  soil_drainage_class?: string
  terrace_type?: string
  buffer_strip_pct?: number
  ridge_height?: string
  row_grade_pct?: number
  
  // K-factor (from SSURGO)
  ssurgo_k_factor?: number
  
  // Output options
  include_factor_maps?: boolean
  include_uncertainty?: boolean
  include_events?: boolean // Returns all EI30 values in timeseries
  scale?: number
}

// UPDATED to match actual GEE API v2.1.0 schema (from openapi.json)
export interface RUSLEResponse {
  // Main results
  soil_loss_rate: number // Annual soil loss (t/ha/yr)
  soil_loss_rate_tons_acre_yr: number // Annual soil loss (t/ac/yr)
  soil_loss_statistics: StatisticsResponse | null
  
  // Individual factor responses (complete factor objects)
  r_factor: RFactorResponse
  k_factor: KFactorResponse
  ls_factor: LSFactorResponse
  c_factor: CFactorResponse
  p_factor: PFactorResponse
  
  // Field information
  field_area_ha: number
  field_area_acres: number
  calculation_date: string // ISO datetime
  
  // Classification and quality
  erosion_class: string // e.g., "slight", "moderate", "severe", "very severe"
  erosion_class_description: string
  uncertainty_percent: number | null
  confidence_level: string | null
  
  // Optional visualization
  soil_loss_map_url: string | null
  factor_maps: { [key: string]: string } | null
  data_quality: { [key: string]: any } | null
  
  // NEW: Multi-scenario analysis results
  baseline?: ScenarioResult // Baseline scenario (practice: 'none')
  scenarios?: ScenarioResult[] // All scenario results
  scenario_comparison?: {
    most_effective_practice: string
    max_reduction_percent: number
    least_effective_practice: string
    min_reduction_percent: number
    practices_exceeding_t_value: string[]
    t_value_used: number
  }
}

// Factor response interfaces
export interface RFactorResponse {
  factor_name: string
  factor_value: number
  unit: string // "MJ·mm/(ha·h·yr)"
  methodology: string | null
  data_source: string | null
  map_url: string | null
  statistics?: StatisticsResponse | null
  qc: QualityControlResponse | null
  annual_precipitation_mm: number | null
  erosive_event_count: number | null
  monthly_values: { [key: string]: number } | null
  yearly_values: { [key: string]: number } | null
}

export interface KFactorResponse {
  factor_name: string
  factor_value: number
  unit: string // "t·ha·h/(ha·MJ·mm)"
  methodology: string | null
  data_source: string
  map_url: string | null
  statistics?: StatisticsResponse | null
  qc: QualityControlResponse | null
  soil_texture: string | null
  organic_matter_percent: number | null
}

export interface LSFactorResponse {
  factor_name: string
  factor_value: number
  unit: string
  methodology: string | null
  data_source: string | null
  map_url: string | null
  statistics?: StatisticsResponse | null
  qc: QualityControlResponse | null
  l_factor: number | null
  s_factor: number | null
  mean_slope_percent: number | null
  mean_slope_length_m: number | null
  tier_used: string | null
}

export interface CFactorResponse {
  factor_name: string
  factor_value: number
  unit: string
  methodology: string | null
  data_source: string | null
  map_url: string | null
  statistics?: StatisticsResponse | null
  qc: QualityControlResponse | null
  crop_type: string | null
  mean_ndvi: number | null
  vegetation_cover_percent: number | null
  monthly_values: { [key: string]: number | null } | null
  tier_used: string | null
}

export interface PFactorResponse {
  factor_name: string
  factor_value: number
  unit: string
  methodology: string | null
  data_source: string | null
  map_url: string | null
  statistics?: StatisticsResponse | null
  qc: QualityControlResponse | null
  detected_practices: string[] | null
  practice_components: { [key: string]: number } | null
  slope_class: string | null
  erosion_reduction_percent: number | null
  mean_slope_percent: number | null
  conservation_rating: string | null
  warnings: string[] | null
  recommendations: string[] | null
}

export interface QualityControlResponse {
  qc_score: number // 0-100
  qc_pass: boolean
  qc_flags: string[]
}

export interface StatisticsResponse {
  mean: number
  min: number
  max: number
  std_dev: number | null
  median: number | null
  p10: number | null
  p90: number | null
}

export interface SpatialStatistics {
  mean: number
  min: number
  max: number
  std: number
  median: number
  total_tons_per_year?: number // For soil loss only
}

// ============================================================================
// Individual Factor Types (Optional - for specialized use)
// ============================================================================

export interface RFactorRequest {
  wkt: string
  start_date: string
  end_date: string
}

export interface RFactorResponse {
  r_factor_statistics: SpatialStatistics
  metadata: {
    data_sources: string[]
    calculation_date: string
  }
}

export interface LSFactorRequest {
  wkt: string
}

export interface LSFactorResponse {
  ls_factor_statistics: SpatialStatistics
  slope_statistics: SpatialStatistics
  slope_length_statistics: SpatialStatistics
  metadata: {
    dem_source: string
    calculation_date: string
  }
}

// ============================================================================
// CSB (Common Land Unit) Types
// ============================================================================

export interface CSBBounds {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: {
      clu_id: string
      acres: number
      state: string
      county: string
      farm_number?: string
      tract_number?: string
      field_number?: string
    }
    geometry: {
      type: 'Polygon' | 'MultiPolygon'
      coordinates: number[][][] | number[][][][]
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
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
  centroid: {
    lat: number
    lng: number
  }
  properties?: Record<string, any>
  rotation_analysis?: {
    rotation_sequence: number[]
    unique_crops: number
    pattern_type: string
    years_analyzed: string[]
    sustainability_rating: string
  }
  crop_names?: Record<string, string>
  sustainability_metrics?: {
    total_score: number
    diversity_score: number
    cover_crop_bonus: number
    nitrogen_fixation_bonus: number
    rating: string
    has_cover_crops: boolean
    has_nitrogen_fixers: boolean
    unique_crops_count: number
  }
}

export interface CSBQueryParams {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
  zoom?: number // Map zoom level (1-20, default: 10)
  limit?: number // Max features to return (1-5000, default: 1000)
}

export interface CSBTileUrlRequest {
  opacity?: number
  min_complexity?: number
  max_complexity?: number
}

export interface CSBTileUrlResponse {
  tile_url: string
  description: string
}

// ============================================================================
// Terrain Analysis Types
// ============================================================================

export interface TerrainRequest {
  wkt: string
  attributes?: string[] // Default: ['elevation', 'slope', 'aspect']
}

export interface TerrainResponse {
  elevation_statistics?: SpatialStatistics
  slope_statistics?: SpatialStatistics
  aspect_statistics?: SpatialStatistics
  metadata: {
    dem_source: string
    resolution_meters: number
    calculation_date: string
  }
}

// ============================================================================
// Vegetation / NDVI Types
// ============================================================================

export interface SentinelRequest {
  wkt: string
  start_date: string
  end_date: string
  cloud_cover_max?: number // Default: 20
}

export interface SentinelResponse {
  ndvi_statistics: SpatialStatistics
  time_series?: Array<{
    date: string
    ndvi_mean: number
    cloud_cover: number
  }>
  metadata: {
    image_count: number
    date_range: {
      start: string
      end: string
    }
  }
}

// ============================================================================
// Climate Data Types
// ============================================================================

export interface ClimateRequest {
  wkt: string
  start_year: number
  end_year: number
}

export interface ClimateResponse {
  precipitation_statistics: SpatialStatistics
  temperature_statistics: SpatialStatistics
  metadata: {
    data_source: string
    year_range: {
      start: number
      end: number
    }
  }
}

// ============================================================================
// Drought Assessment Types
// ============================================================================

export interface DroughtAssessmentRequest {
  wkt: string
  date?: string
  soil_awc?: number
  soil_texture?: string
  include_technical?: boolean
  auto_adjust_date?: boolean
}

export interface DroughtAssessment {
  assessment_date: string
  drought_status: {
    overall_severity: 'none' | 'abnormally_dry' | 'moderate' | 'severe' | 'extreme' | 'exceptional'
    confidence_level: 'low' | 'medium' | 'high'
    primary_concerns: string[]
  }
  drought_indices: {
    spi: DroughtIndex
    spei: DroughtIndex
    eddi: DroughtIndex
    pdsi: DroughtIndex
  }
  impacts: {
    agriculture: string
    water_resources: string
    vegetation_health: string
  }
  recommendations: string[]
}

export interface DroughtIndex {
  value: number
  category: string
  interpretation: string
  technical_details?: {
    timescale_days: number
    data_quality: string
  }
}

// ============================================================================
// Resource Concerns Types
// ============================================================================

export interface ResourceConcernRequest {
  wkt: string
  year?: number
  include_geojson?: boolean
}

export interface ComprehensiveAssessment {
  concerns: ResourceConcern[]
  priority_ranking: string[]
  overall_risk_score: number
  recommended_practices: string[]
}

export interface ResourceConcern {
  concern_type: 'erosion' | 'ponding' | 'concentrated_flow' | 'soil_quality' | 'productivity' | 'drainage'
  severity: 'low' | 'moderate' | 'high' | 'critical'
  affected_area_pct: number
  metrics: Record<string, number>
  description: string
}

export interface ErosionAssessment {
  sheet_rill_erosion: {
    avg_tons_ac_yr: number
    severity: string
  }
  wind_erosion?: {
    avg_tons_ac_yr: number
    severity: string
  }
}

export interface PondingAssessment {
  ponding_frequency: string
  affected_area_pct: number
  severity: string
}

export interface ProductivityAssessment {
  avg_productivity_index: number
  limiting_factors: string[]
  recommendations: string[]
}

// ============================================================================
// Comprehensive Field Assessment (/api/assessment/all)
// ============================================================================

export interface ComprehensiveFieldAssessment {
  assessment_year: number
  timestamp: string
  erosion_risk: {
    statistics: {
      mean_risk: number
      min_risk: number
      max_risk: number
      std_dev: number
      high_risk_area_pct: number
    }
    risk_levels: Record<string, any>
    visualization: {
      thumbnail_url: string
      tile_url: string
      description: string
    }
    methodology: string
  }
  concentrated_flow: {
    flow_metrics: {
      channel_density_m_per_ha: number
      convergent_area_pct: number
      high_gully_risk_pct: number
    }
    twi_stats: {
      mean: number
      p75: number
      p90: number
    }
    spi_stats: {
      mean: number
      max: number
      p90: number
      p95: number
    }
    visualization: {
      spi_tile_url: string
      twi_tile_url: string
      channels_tile_url: string
      spi_thumbnail_url: string
      description: string
    }
    methodology: string
  }
  ponding: {
    ponding_metrics: {
      depression_area_pct: number
      twi_above_12_pct: number
      high_ponding_risk_pct: number
    }
    twi_stats: {
      mean: number
      p75: number
      p90: number
    }
    visualization: {
      twi_tile_url: string
      depressions_tile_url: string
      wet_areas_tile_url: string
      twi_thumbnail_url: string
      description: string
    }
    methodology: string
  }
  drought: {
    water_balance: {
      growing_season_precip_mm: number
      growing_season_eto_mm: number
      balance_mm: number
    }
    drought_indices: {
      pdsi_mean: number
      pdsi_min: number
    }
    visualization: {
      water_deficit_tile_url: string
      vpd_tile_url: string
      deficit_thumbnail_url: string
      description: string
    }
    methodology: string
  }
  soil_quality: {
    productivity_stability: {
      ndvi_peak_mean: number
      ndvi_peak_std: number
      ndvi_peak_cv: number
      years_analyzed: number
    }
  }
  productivity: {
    productivity_metrics: {
      ndvi_peak_mean: number
      ndvi_peak_std: number
    }
    yield_gap: {
      mean_gap_pct: number
      p75_gap_pct: number
      p90_gap_pct: number
    }
    visualization: {
      yield_gap_tile_url: string
      mean_ndvi_tile_url: string
      max_ndvi_tile_url: string
      yield_gap_thumbnail_url: string
      description: string
    }
    methodology: string
  }
  svi: {
    svi_metrics: {
      surface_loss_mean: number
      surface_loss_high_pct: number
      subsurface_drained_mean: number
      subsurface_drained_high_pct: number
      subsurface_undrained_mean: number
      subsurface_undrained_high_pct: number
    }
    visualization: {
      surface_tile_url: string
      subsurface_drained_tile_url: string
      subsurface_undrained_tile_url: string
      surface_thumbnail_url: string
      description: string
    }
    methodology: string
  }
}

export interface ComprehensiveAssessmentRequest {
  wkt: string
  year?: number
  include_visualizations?: boolean
}

// ============================================================================
// Error Response Type
// ============================================================================

export interface GEEAPIErrorResponse {
  detail: string // v2.1.0 uses 'detail' instead of 'error'
  status?: number
  timestamp?: string
}

export interface GEEAPIError {
  error: string
  detail?: string
  status?: number
}

export interface CSBTileParams {
  z: number
  x: number
  y: number
}
