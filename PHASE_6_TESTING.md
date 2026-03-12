# Phase 6 Spatial Features - Testing Guide

## ✅ Implementation Complete

All Phase 6 spatial features have been implemented and tested. This document provides testing instructions for the complete field-selection → interpretation workflow.

## Components Implemented

### 1. WKT Utilities (`src/lib/spatial/wkt-utils.ts`)
- ✅ `geometryToWKT()` - Convert GeoJSON/Leaflet to WKT format
- ✅ `wktToGeoJSON()` - Parse WKT back to GeoJSON
- ✅ `calculateAreaAcres()` - Spherical area calculation
- ✅ `isValidPolygon()` - Polygon validation

### 2. MUKEY Query (`src/lib/spatial/mukey-query.ts`)
- ✅ `getMukeysFromGeometry()` - Get MUKEYs from geometry
- ✅ `getMapUnitsFromGeometry()` - Get map unit details
- ✅ `getMapUnitsWithArea()` - Get map units with area
- ✅ `testSDAConnection()` - Health check
- ✅ Uses NRCS SDA API: `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- ✅ Proper query format: `SELECT FROM mapunit WHERE mukey IN (...)`

### 3. Geocoding (`src/lib/spatial/geocoding.ts`)
- ✅ `geocodeAddress()` - Search locations
- ✅ `parseCoordinates()` - Parse "lat, lon" input
- ✅ `reverseGeocode()` - Coords → address
- Uses Nominatim (OpenStreetMap) - free, no API key required

### 4. File Parser (`src/lib/spatial/fileParser.ts`)
- ✅ `parseGeoJSON()` - Parse GeoJSON files (working)
- ⏳ `parseKML()` - Requires @tmcw/togeojson (optional)
- ⏳ `parseShapefile()` - Requires shapefile lib (optional)
- ✅ Validation: 0.5-10,000 acres, max 1,000 vertices

### 5. Python Spatial Endpoint (`python-service/api/spatial.py`)
- ✅ `/mukeys-from-geometry` POST endpoint
- ✅ Returns `{success, count, mukeys[], map_units[]}`
- ✅ Service layer in `sda_spatial_service.py`

### 6. Auto-Interpret Page (`src/app/interpret/auto/page.tsx`)
- ✅ Loads field data from sessionStorage
- ✅ Queries MUKEY from geometry (if needed)
- ✅ Runs interpretations with valid names
- ✅ Displays results with color coding

## Test Files Created

### test-spatial-query.js
Standalone test script to verify NRCS SDA API connectivity and MUKEY queries.

**Usage:**
```bash
cd interp-engine-app
node test-spatial-query.js
```

**Expected Output:**
```
✅ SUCCESS! Found map units:
  - MUKEY: 2835021, Symbol: L107, Name: Webster clay loam
  - MUKEY: 2765537, Symbol: L138B, Name: Clarion loam
  - MUKEY: 2800480, Symbol: L55, Name: Nicollet loam
```

### test-field.geojson
Sample GeoJSON file for testing file upload functionality.

**Location:** Central Iowa (Story County)
**Size:** ~40 acres
**Usage:** Upload this file in the field-selection page → Upload mode

## Manual Testing Workflow

### Test 1: Browse CSB Fields (Already Working)
1. Navigate to http://localhost:3000/field-selection
2. Select "Browse" tab
3. Pan/zoom map to any agricultural area
4. Click on a green CSB field boundary
5. Click "Analyze Field"
6. Should redirect to `/interpret/auto` and run 6 interpretations

**Expected Result:** Interpretations complete with ratings

### Test 2: Draw Field ✨ NEW
1. Navigate to http://localhost:3000/field-selection
2. Select "Draw" tab
3. Click "Start Drawing"
4. Draw a polygon on the map (click multiple points, double-click to finish)
5. Click "Analyze Field"

**Expected Workflow:**
```
1. Draw tool creates GeoJSON Polygon
2. Page redirects to /interpret/auto
3. Auto page calls getMapUnitsFromGeometry(geometry)
   → Converts GeoJSON → WKT
   → Queries SDA API
   → Returns MUKEYs
4. Uses first MUKEY to run interpretations
5. Displays results
```

**Expected Console Output:**
```
Querying SSURGO with WKT: POLYGON((-93.62 42.03, ...))
Found 4 map units. Using MUKEY: 2835021 (Webster clay loam)
```

### Test 3: Upload GeoJSON ✨ NEW
1. Navigate to http://localhost:3000/field-selection
2. Select "Upload" tab
3. Click "Choose File" and select `test-field.geojson`
4. Should display: "Field boundary parsed: ~40.2 acres"
5. Click "Analyze Field"

**Expected Workflow:**
Same as Test 2 (geometry → MUKEY → interpretations)

### Test 4: Geocoding Search ✨ NEW
1. Navigate to http://localhost:3000/field-selection
2. Enter "Ames, Iowa" in the search box
3. Press Enter or click Search

**Expected Result:**
- Shows multiple results (Ames, Iowa; Ames Township; etc.)
- Click any result → map pans/zooms to location
- Can then use Browse/Draw/Upload modes at that location

**Alternative Searches:**
- `"42.0308, -93.6319"` (coordinates)
- `"Boone, Iowa"`
- `"50014"` (ZIP code)

## API Endpoints Tested

### Frontend (Direct Browser Calls)
- ✅ Nominatim Geocoding: `https://nominatim.openstreetmap.org/search`
- ✅ NRCS SDA API: `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`
- ✅ CSB Layer: `https://gee-api-production.up.railway.app/csb-fields`

### Backend (Next.js API)
- ✅ `/api/interpret/auto` - Auto-run interpretations

### Python Service (Optional)
- ✅ `/spatial/mukeys-from-geometry` - Server-side MUKEY query

## Valid Interpretation Names

The following interpretations are now used (all exist in dataset):

1. `ENG - Septic Tank Absorption Fields`
2. `ENG - Dwellings With Basements`
3. `ENG - Dwellings W/O Basements`
4. `ENG - Local Roads and Streets`
5. `ENG - Lawn, Landscape, Golf Fairway`
6. `ENG - Small Commercial Buildings`

To see all 2,111+ available interpretations:
```javascript
import { getInterpretationNames } from '@/lib/data/loader'
const names = getInterpretationNames()
```

## Known Limitations

### Multi-MUKEY Handling
Currently, when a field crosses multiple soil map units, the system:
- Uses the **first MUKEY** returned by the spatial query
- Logs all MUKEYs to console

**Future Enhancement:**
Implement area-weighted aggregation:
1. Use `getMapUnitsWithArea()` to get area percentages
2. Run interpretations for each MUKEY
3. Calculate area-weighted rating OR return worst-case rating

### File Formats
- ✅ **GeoJSON** - Fully supported
- ⏳ **KML** - Requires installing `@tmcw/togeojson`
- ⏳ **Shapefile** - Requires installing `shapefile` library

### Coordinate Systems
All geometries are assumed to be in **WGS84 (EPSG:4326)** format.

## Troubleshooting

### "No soil map units found"
- Check that the field is located in the United States
- SSURGO coverage is nationwide but Urban areas may have limited data
- Try drawing in agricultural/rural areas

### "SDA API error: 400"
- Verify WKT format is correct
- Check that polygon is closed (first point = last point)
- Ensure coordinates are in longitude, latitude order

### "Interpretation not found"
- Verify interpretation name matches dataset format (e.g., "ENG - " prefix)
- Use `getInterpretationNames()` to list available interpretations

### Geocoding returns no results
- Check spelling of location name
- Try using state name: "City, State" format
- Nominatim is free but has rate limits (1 req/sec)

## Performance Notes

### SDA Query Timing
- Typical response: 2-5 seconds for simple polygons
- Timeout set to 45 seconds
- Large/complex polygons may be slower

### Browser vs Python Endpoint
- **Browser (mukey-query.ts)**: Direct SDA calls, no caching
- **Python (/spatial/mukeys-from-geometry)**: Server-side, can add caching

For production, consider:
1. Caching MUKEY results by geometry hash
2. Using Python endpoint for better rate limiting
3. Batching interpretation requests

## Next Steps (Optional Enhancements)

1. **Install KML/Shapefile support:**
   ```bash
   npm install @tmcw/togeojson shapefile
   ```

2. **Add interpretation list endpoint:**
   - Create `/api/interpretations/list`
   - Returns all 2,111+ interpretation names grouped by category

3. **Multi-MUKEY aggregation:**
   - Calculate area-weighted interpretation ratings
   - Display per-MUKEY breakdown in results

4. **Caching:**
   - Add browser localStorage cache for MUKEY queries
   - Add server-side Redis cache for Python endpoint

5. **Batch API:**
   - Create `/api/interpret/batch` endpoint
   - Accept multiple MUKEYs, return aggregated results

## References

- [NRCS Soil Data Access](https://sdmdataaccess.sc.egov.usda.gov/)
- [SSURGO Documentation](https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- Field-map implementation: `/field-map/ssurgo-spatial/`

---

**Status:** ✅ All core features implemented and tested
**Date:** February 5, 2026
**Phase:** 6 - Advanced Spatial Features
