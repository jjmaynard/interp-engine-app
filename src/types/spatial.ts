/**
 * Type definitions for spatial/GeoJSON data
 * Used for map-based interpretation results
 */

/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * GeoJSON Polygon geometry
 */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Array of linear rings
}

/**
 * GeoJSON MultiPolygon geometry
 */
export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

/**
 * Union of GeoJSON geometry types
 */
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon;

/**
 * GeoJSON Feature with interpretation results
 */
export interface InterpretationFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: {
    mukey: string;
    cokey?: string;
    compname?: string;
    rating: number;
    ratingClass: string;
    interpretationName: string;
    [key: string]: any; // Additional property values
  };
}

/**
 * GeoJSON FeatureCollection
 */
export interface InterpretationFeatureCollection {
  type: 'FeatureCollection';
  features: InterpretationFeature[];
  metadata?: {
    interpretationName: string;
    timestamp: string;
    bbox?: [number, number, number, number]; // [west, south, east, north]
    count: number;
  };
}

/**
 * Bounding box for spatial queries
 */
export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Raster output configuration
 */
export interface RasterConfig {
  width: number;
  height: number;
  bbox: [number, number, number, number];
  resolution: number; // meters
  property: string; // Property to rasterize (e.g., 'rating')
  noData: number; // No data value
}

/**
 * Raster data structure
 */
export interface RasterData {
  data: Float32Array | Float64Array;
  width: number;
  height: number;
  bbox: [number, number, number, number];
  projection: string;
  noData: number;
}
