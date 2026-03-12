/**
 * Test script for spatial MUKEY query functionality
 * Run with: node test-spatial-query.js
 */

// Test GeoJSON polygon in Central Iowa (approximately 40 acres)
const testPolygon = {
  "type": "Polygon",
  "coordinates": [
    [
      [-93.6200, 42.0300],
      [-93.6150, 42.0300],
      [-93.6150, 42.0270],
      [-93.6200, 42.0270],
      [-93.6200, 42.0300]
    ]
  ]
};

console.log('Testing NRCS SDA Spatial Query...\n');
console.log('Test Polygon:', JSON.stringify(testPolygon, null, 2));

// Convert GeoJSON to WKT
function geometryToWKT(geometry) {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map(ring => {
      const coords = ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      return `(${coords})`;
    }).join(', ');
    return `POLYGON (${rings})`;
  }
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

const wkt = geometryToWKT(testPolygon);
console.log('\nWKT:', wkt);

// Build SDA query
const query = `
  SELECT DISTINCT m.mukey, m.musym, m.muname
  FROM mapunit m
  WHERE m.mukey IN (
    SELECT DISTINCT mukey 
    FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')
  )
  ORDER BY m.musym`;

console.log('\nSDA Query:', query);

// Execute query
async function testSDAQuery() {
  try {
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('format', 'JSON');

    const response = await fetch('https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`SDA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('\nSDA Response:', JSON.stringify(data, null, 2));

    if (data.Table && data.Table.length > 0) {
      console.log('\n✅ SUCCESS! Found map units:');
      data.Table.forEach(row => {
        console.log(`  - MUKEY: ${row[0]}, Symbol: ${row[1]}, Name: ${row[2]}`);
      });
    } else {
      console.log('\n⚠️ No map units found for this location');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testSDAQuery();
