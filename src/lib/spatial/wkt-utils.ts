/**
 * WKT (Well-Known Text) Utilities for Spatial Queries
 * Adapted from field-map SSURGO implementation
 */

import type * as L from 'leaflet'
import type * as GeoJSON from 'geojson'
import * as turf from '@turf/turf'

/**
 * Convert various geometry formats to WKT (Well-Known Text)
 * Supports Leaflet Polygon, GeoJSON Polygon, and coordinate arrays
 * 
 * @param geometry - Leaflet polygon, GeoJSON polygon, or array of [lng, lat] coordinates
 * @returns WKT POLYGON string
 * 
 * @example
 * // From GeoJSON
 * const wkt = geometryToWKT({ type: 'Polygon', coordinates: [[[lng, lat], ...]] })
 * // Returns: "POLYGON((lng lat, lng lat, ...))"
 */
export function geometryToWKT(
  geometry: L.Polygon | GeoJSON.Polygon | number[][]
): string {
  let coords: number[][]

  // Handle Leaflet Polygon
  if ('getLatLngs' in geometry && typeof geometry.getLatLngs === 'function') {
    const latlngs = geometry.getLatLngs()[0] as L.LatLng[]
    coords = latlngs.map((ll) => [ll.lng, ll.lat])
  }
  // Handle GeoJSON Polygon
  else if ('type' in geometry && geometry.type === 'Polygon') {
    coords = geometry.coordinates[0].map((c) => [c[0], c[1]])
  }
  // Handle raw coordinate array [[lng, lat], ...]
  else if (Array.isArray(geometry)) {
    coords = geometry
  } else {
    throw new Error('Unsupported geometry type. Expected Leaflet Polygon, GeoJSON Polygon, or coordinate array.')
  }

  // Ensure ring is closed (first point === last point)
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([first[0], first[1]])
  }

  // Format as WKT POLYGON
  const coordString = coords.map((c) => `${c[0]} ${c[1]}`).join(', ')
  return `POLYGON((${coordString}))`
}

/**
 * Simplify a geometry to reduce complexity for SDA queries
 * Uses Turf simplify with a tolerance that balances accuracy and performance
 * 
 * @param geometry - GeoJSON Polygon or coordinate array
 * @param tolerance - Simplification tolerance (default: 0.0001 degrees ~10m)
 * @returns Simplified coordinate array
 */
export function simplifyGeometry(
  geometry: GeoJSON.Polygon | number[][],
  tolerance: number = 0.0001
): number[][] {
  try {
    // Convert to GeoJSON if needed
    let geojson: GeoJSON.Polygon
    if (Array.isArray(geometry)) {
      geojson = {
        type: 'Polygon',
        coordinates: [geometry]
      }
    } else {
      geojson = geometry
    }

    // Simplify using Turf (tolerance in degrees, ~0.0001° ≈ 10m)
    const simplified = turf.simplify(geojson, { tolerance, highQuality: false })
    
    // Return simplified coordinates
    return simplified.coordinates[0]
  } catch (error) {
    console.warn('Geometry simplification failed, using original:', error)
    // Return original if simplification fails
    if (Array.isArray(geometry)) {
      return geometry
    }
    return geometry.coordinates[0]
  }
}

/**
 * Parse WKT string to GeoJSON Polygon geometry
 * 
 * @param wkt - WKT POLYGON string
 * @returns GeoJSON Polygon or null if parsing fails
 * 
 * @example
 * const geojson = wktToGeoJSON("POLYGON((lng lat, lng lat, ...))")
 * // Returns: { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
 */
export function wktToGeoJSON(wkt: string): GeoJSON.Polygon | null {
  try {
    // Simple WKT POLYGON parser
    const match = wkt.match(/POLYGON\(\((.*?)\)\)/i)
    if (!match) return null

    const coordString = match[1]
    const coords = coordString.split(',').map((pair) => {
      const [lng, lat] = pair.trim().split(' ').map(Number)
      return [lng, lat]
    })

    return {
      type: 'Polygon',
      coordinates: [coords],
    }
  } catch (error) {
    console.error('Error parsing WKT:', error)
    return null
  }
}

/**
 * Calculate area of a polygon in acres
 * Uses spherical approximation for lat/lon coordinates
 * 
 * @param geometry - GeoJSON Polygon
 * @returns Area in acres
 */
export function calculateAreaAcres(geometry: GeoJSON.Polygon): number {
  const coords = geometry.coordinates[0]
  
  // Simple spherical area calculation
  // For more accuracy, use turf.area() which we already have installed
  let area = 0
  const R = 6371000 // Earth radius in meters
  
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i]
    const [lon2, lat2] = coords[i + 1]
    
    const dLon = (lon2 - lon1) * Math.PI / 180
    const avgLat = ((lat1 + lat2) / 2) * Math.PI / 180
    
    area += dLon * Math.cos(avgLat)
  }
  
  // Convert to square meters then to acres
  const areaM2 = Math.abs(area) * R * R
  const acres = areaM2 / 4046.86
  
  return acres
}

/**
 * Validate that a geometry is a valid polygon
 * 
 * @param geometry - Any geometry object
 * @returns True if valid polygon
 */
export function isValidPolygon(geometry: any): geometry is GeoJSON.Polygon {
  return (
    geometry &&
    typeof geometry === 'object' &&
    geometry.type === 'Polygon' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0 &&
    Array.isArray(geometry.coordinates[0]) &&
    geometry.coordinates[0].length >= 4 // Minimum for closed ring
  )
}
