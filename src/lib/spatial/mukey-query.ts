/**
 * MUKEY Spatial Query Module
 * Query NRCS Soil Data Access (SDA) API to get map unit keys (MUKEYs) for a geometry
 */

import type * as GeoJSON from 'geojson'
import { geometryToWKT, simplifyGeometry } from './wkt-utils'

const SDA_URL = 'https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest'

export interface MukeyResult {
  mukey: string
  musym: string
  muname: string
}

export interface MukeyWithArea extends MukeyResult {
  area_ac: number
  percent: number
}

/**
 * Execute a query against the NRCS Soil Data Access API
 */
async function executeSDAQuery(
  query: string,
  timeout: number = 90000
): Promise<any> {
  const params = new URLSearchParams()
  params.append('query', query)
  params.append('format', 'JSON')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(SDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`SDA query failed: ${response.status} ${response.statusText}\n${text}`)
    }

    const responseText = await response.text()
    const data = JSON.parse(responseText)

    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Query timed out after ${timeout / 1000} seconds`)
    }
    throw error
  }
}

/**
 * Get map unit keys (MUKEYs) intersecting with a geometry
 * Basic query - returns just the MUKEYs
 * 
 * @param geometry - GeoJSON Polygon or coordinate array
 * @param options - Query options
 * @returns Array of MUKEYs
 * 
 * @example
 * const mukeys = await getMukeysFromGeometry(fieldBoundary)
 * // Returns: ['462809', '462810', ...]
 */
export async function getMukeysFromGeometry(
  geometry: GeoJSON.Polygon | number[][],
  options: { timeout?: number; simplify?: boolean } = {}
): Promise<string[]> {
  const { timeout = 90000, simplify = true } = options
  
  try {
    // Simplify geometry to reduce query complexity
    const processedGeometry = simplify ? simplifyGeometry(geometry) : geometry
    const wkt = geometryToWKT(processedGeometry)
    console.log('Querying SSURGO with WKT:', wkt.substring(0, 100) + '...')

    const query = `
      SELECT DISTINCT m.mukey
      FROM mapunit m
      WHERE m.mukey IN (
        SELECT DISTINCT mukey 
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')
      )
      ORDER BY m.mukey
    `

    const data = await executeSDAQuery(query, timeout)

    if (!data?.Table || data.Table.length === 0) {
      return []
    }

    return data.Table.map((row: any[]) => row[0])
  } catch (error) {
    console.error('Error querying MUKEYs from geometry:', error)
    throw error
  }
}

/**
 * Get map unit details (MUKEY + name + symbol) intersecting with a geometry
 * 
 * @param geometry - GeoJSON Polygon or coordinate array
 * @param options - Query options
 * @returns Array of map unit details
 * 
 * @example
 * const mapUnits = await getMapUnitsFromGeometry(fieldBoundary)
 * // Returns: [{ mukey: '462809', musym: 'B12A', muname: 'Belfry silty clay loam' }, ...]
 */
export async function getMapUnitsFromGeometry(
  geometry: GeoJSON.Polygon | number[][],
  options: { timeout?: number; simplify?: boolean } = {}
): Promise<MukeyResult[]> {
  const { timeout = 90000, simplify = true } = options
  
  try {
    // Simplify geometry to reduce query complexity  
    const processedGeometry = simplify ? simplifyGeometry(geometry) : geometry
    const wkt = geometryToWKT(processedGeometry)

    const query = `
      SELECT DISTINCT m.mukey, m.musym, m.muname
      FROM mapunit m
      WHERE m.mukey IN (
        SELECT DISTINCT mukey 
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')
      )
      ORDER BY m.musym
    `

    const data = await executeSDAQuery(query, timeout)

    if (!data?.Table || data.Table.length === 0) {
      return []
    }

    return data.Table.map((row: any[]) => ({
      mukey: row[0],
      musym: row[1],
      muname: row[2],
    }))
  } catch (error) {
    console.error('Error querying map units from geometry:', error)
    throw error
  }
}

/**
 * Get map units with area calculation
 * Returns MUKEYs with the area (in acres) that intersects with the input geometry
 * 
 * @param geometry - GeoJSON Polygon or coordinate array
 * @param options - Query options
 * @returns Array of map units with area and percentage
 * 
 * @example
 * const mapUnits = await getMapUnitsWithArea(fieldBoundary)
 * // Returns: [
 * //   { mukey: '462809', musym: 'B12A', muname: '...', area_ac: 45.3, percent: 60 },
 * //   { mukey: '462810', musym: 'C03B', muname: '...', area_ac: 30.2, percent: 40 }
 * // ]
 */
export async function getMapUnitsWithArea(
  geometry: GeoJSON.Polygon | number[][],
  options: { timeout?: number } = {}
): Promise<MukeyWithArea[]> {
  const { timeout = 45000 } = options
  
  try {
    const wkt = geometryToWKT(geometry)

    // Query for clipped geometry and area calculation
    const query = `
      WITH geom_data AS (
        SELECT 
          mupolygongeo.STIntersection(geometry::STGeomFromText('${wkt}', 4326)) AS geom,
          mukey
        FROM mupolygon 
        WHERE mupolygongeo.STIntersects(geometry::STGeomFromText('${wkt}', 4326)) = 1
      ),
      area_data AS (
        SELECT 
          mukey,
          GEOGRAPHY::STGeomFromWKB(
            geom.STUnion(geom.STStartPoint()).STAsBinary(), 4326
          ).MakeValid().STArea() * 0.000247105 AS area_ac
        FROM geom_data
      )
      SELECT 
        m.mukey,
        m.musym,
        m.muname,
        CAST(SUM(a.area_ac) AS DECIMAL(10,2)) AS area_ac
      FROM area_data a
      INNER JOIN mapunit m ON a.mukey = m.mukey
      GROUP BY m.mukey, m.musym, m.muname
      ORDER BY area_ac DESC
    `

    const data = await executeSDAQuery(query, timeout)

    if (!data?.Table || data.Table.length === 0) {
      return []
    }

    // Calculate percentages
    const totalArea = data.Table.reduce((sum: number, row: any[]) => sum + (row[3] || 0), 0)

    return data.Table.map((row: any[]) => ({
      mukey: row[0],
      musym: row[1],
      muname: row[2],
      area_ac: row[3] || 0,
      percent: totalArea > 0 ? Math.round((row[3] / totalArea) * 100) : 0,
    }))
  } catch (error) {
    console.error('Error querying map units with area:', error)
    throw error
  }
}

/**
 * Test connection to SDA API
 */
export async function testSDAConnection(): Promise<boolean> {
  try {
    // Simple test query - get first 5 mukeys from Nebraska
    const query = `
      SELECT TOP 5 mukey, musym, muname
      FROM mapunit
      WHERE mukey IN (
        SELECT DISTINCT mukey FROM legend WHERE areasymbol LIKE 'NE%'
      )
    `
    
    const data = await executeSDAQuery(query, 10000)
    return data?.Table && data.Table.length > 0
  } catch (error) {
    console.error('SDA connection test failed:', error)
    return false
  }
}
