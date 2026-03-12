/**
 * Parse uploaded spatial files (GeoJSON, KML, Shapefile)
 * Extract field boundary and calculate area
 */

import * as turf from '@turf/turf'

export interface ParsedBoundary {
  geometry: GeoJSON.Geometry
  acres: number
  name?: string
  properties?: Record<string, any>
}

/**
 * Parse GeoJSON file
 */
export async function parseGeoJSON(file: File): Promise<ParsedBoundary> {
  const text = await file.text()
  const data = JSON.parse(text)

  // Handle FeatureCollection
  if (data.type === 'FeatureCollection') {
    if (!data.features || data.features.length === 0) {
      throw new Error('GeoJSON FeatureCollection is empty')
    }
    // Use first feature
    const feature = data.features[0]
    return extractBoundaryFromFeature(feature)
  }

  // Handle single Feature
  if (data.type === 'Feature') {
    return extractBoundaryFromFeature(data)
  }

  // Handle direct Geometry
  if (data.type === 'Polygon' || data.type === 'MultiPolygon') {
    return extractBoundaryFromGeometry(data)
  }

  throw new Error('Invalid GeoJSON format. Expected Feature, FeatureCollection, or Geometry.')
}

/**
 * Parse KML file
 */
export async function parseKML(file: File): Promise<ParsedBoundary> {
  const text = await file.text()
  
  // Parse XML
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')

  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid KML file format')
  }

  // Convert KML to GeoJSON using toGeoJSON library
  // Note: We'll need to install @tmcw/togeojson for this
  // For now, throw an error to indicate it needs implementation
  throw new Error('KML parsing requires @tmcw/togeojson library. Please install it: npm install @tmcw/togeojson')
}

/**
 * Parse Shapefile (zipped)
 */
export async function parseShapefile(file: File): Promise<ParsedBoundary> {
  // Shapefiles are typically uploaded as .zip containing .shp, .shx, .dbf, etc.
  // We'll need shapefile-js library for this
  throw new Error('Shapefile parsing requires shapefile library. Please install it: npm install shapefile')
}

/**
 * Extract boundary from GeoJSON Feature
 */
function extractBoundaryFromFeature(feature: GeoJSON.Feature): ParsedBoundary {
  if (!feature.geometry) {
    throw new Error('Feature has no geometry')
  }

  return extractBoundaryFromGeometry(feature.geometry, feature.properties || {})
}

/**
 * Extract boundary from GeoJSON Geometry
 */
function extractBoundaryFromGeometry(
  geometry: GeoJSON.Geometry,
  properties: Record<string, any> = {}
): ParsedBoundary {
  // Validate geometry type
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    throw new Error(`Unsupported geometry type: ${geometry.type}. Only Polygon and MultiPolygon are supported.`)
  }

  // Calculate area in acres
  const areaMeters = turf.area(geometry as any)
  const acres = areaMeters / 4046.86 // Convert square meters to acres

  // Validate area constraints
  if (acres < 0.5) {
    throw new Error(`Field area (${acres.toFixed(2)} acres) is too small. Minimum is 0.5 acres.`)
  }
  if (acres > 10000) {
    throw new Error(`Field area (${acres.toFixed(2)} acres) is too large. Maximum is 10,000 acres.`)
  }

  // Extract name from properties if available
  const name = properties.name || properties.NAME || properties.field_name || properties.FIELD_NAME

  return {
    geometry,
    acres,
    name,
    properties,
  }
}

/**
 * Main parser that detects file type and routes to appropriate parser
 */
export async function parseFieldBoundaryFile(file: File): Promise<ParsedBoundary> {
  const extension = file.name.toLowerCase().split('.').pop()

  switch (extension) {
    case 'geojson':
    case 'json':
      return parseGeoJSON(file)
    
    case 'kml':
      return parseKML(file)
    
    case 'zip':
      return parseShapefile(file)
    
    default:
      throw new Error(`Unsupported file type: ${extension}. Supported formats: GeoJSON (.json, .geojson), KML (.kml), Shapefile (.zip)`)
  }
}

/**
 * Validate polygon complexity (max vertices)
 */
export function validatePolygonComplexity(geometry: GeoJSON.Geometry, maxVertices: number = 1000): boolean {
  let vertexCount = 0

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => {
      vertexCount += ring.length
    })
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        vertexCount += ring.length
      })
    })
  }

  return vertexCount <= maxVertices
}
