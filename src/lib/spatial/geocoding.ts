/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free, no API key required
 * Rate limit: 1 request/second
 */

export interface GeocodingResult {
  lat: number
  lon: number
  display_name: string
  boundingbox?: [string, string, string, string] // [south, north, west, east]
  type?: string
  importance?: number
}

export interface CoordinateInput {
  lat: number
  lon: number
}

/**
 * Parse coordinate input in various formats:
 * - "40.8136, -96.7026"
 * - "40.8136,-96.7026"
 * - "lat: 40.8136, lon: -96.7026"
 */
export function parseCoordinates(input: string): CoordinateInput | null {
  // Remove common prefixes
  const cleaned = input
    .toLowerCase()
    .replace(/lat(itude)?:?\s*/gi, '')
    .replace(/lon(gitude)?:?\s*/gi, '')
    .replace(/lng:?\s*/gi, '')
    .trim()

  // Try to extract two numbers
  const coordRegex = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  const match = cleaned.match(coordRegex)

  if (match) {
    const lat = parseFloat(match[1])
    const lon = parseFloat(match[2])

    // Validate ranges
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon }
    }
  }

  return null
}

/**
 * Search for a location by address/place name
 */
export async function geocodeAddress(
  query: string
): Promise<GeocodingResult[]> {
  // Check if input is coordinates first
  const coords = parseCoordinates(query)
  if (coords) {
    return [
      {
        lat: coords.lat,
        lon: coords.lon,
        display_name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
      },
    ]
  }

  // Use Nominatim for address search
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '1')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'NRCS-Interpretation-Engine/1.0', // Required by Nominatim
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    const results = await response.json()

    return results.map((r: any) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display_name: r.display_name,
      boundingbox: r.boundingbox,
      type: r.type,
      importance: r.importance,
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error('Failed to search location. Please try again.')
  }
}

/**
 * Reverse geocode: get address from coordinates
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', lat.toString())
  url.searchParams.set('lon', lon.toString())
  url.searchParams.set('format', 'json')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'NRCS-Interpretation-Engine/1.0',
      },
    })

    if (!response.ok) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    }

    const result = await response.json()
    return result.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }
}
