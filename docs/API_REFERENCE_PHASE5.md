# API Reference - Phase 5 Endpoints

**Auto Interpretation API**  
**Version:** 1.0  
**Last Updated:** February 2, 2026

This document describes the new API endpoints added in Phase 5 for automatic property calculation and interpretation evaluation.

---

## Overview

Phase 5 introduces endpoints that enable automatic property calculation from SSURGO data via integration with the Python Property Service. Users can now evaluate interpretations by providing just a MUKEY, without manually entering property values.

**Architecture:**
```
Client → Next.js API → Python Service → NRCS SDA API → SSURGO Data
                    ↓
              Interpretation Engine → Fuzzy Logic Evaluation → Results
```

---

## Endpoints

### 1. Calculate Properties

Calculate soil properties from SSURGO data for a specific map unit.

**Endpoint:** `POST /api/properties/calculate`

**Request Body:**
```typescript
{
  mukey: string;          // Map Unit Key (numeric string)
  propertyIds: number[];  // Array of property IDs to calculate
  queryStrategy?: 'individual' | 'consolidated' | 'auto';  // Optional, default: 'auto'
}
```

**Response:**
```typescript
{
  success: boolean;
  values: Record<number, PropertyValue>;  // Property ID → calculated value
  metadata?: {
    mukey: string;
    total_properties: number;
    query_count: number;
    properties_requested: number;
    reduction_pct: number;
    cache_hits: number;
    execution_time_ms: number;
  };
  error?: string;
}
```

**PropertyValue:**
```typescript
{
  value: number | string | null;
  low?: number | null;
  high?: number | null;
  unit?: string | null;
  method?: string;
  source?: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/properties/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "mukey": "462809",
    "propertyIds": [2, 3, 4]
  }'
```

**Response Example:**
```json
{
  "success": true,
  "values": {
    "2": {
      "value": 8.0,
      "low": 3.0,
      "high": 15.0,
      "unit": null,
      "method": "weighted_average"
    },
    "3": {
      "value": 100.0,
      "low": 75.0,
      "high": 150.0,
      "unit": "cm"
    }
  },
  "metadata": {
    "mukey": "462809",
    "total_properties": 3,
    "query_count": 2,
    "execution_time_ms": 1247
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid MUKEY format or empty property list
- `500 Internal Server Error` - Property calculation failed
- `503 Service Unavailable` - Python service not reachable

---

### 2. Auto Interpretation (⭐ Key Endpoint)

Automatically calculate properties and evaluate interpretation in a single request.

**Endpoint:** `POST /api/interpret/auto`

**Request Body:**
```typescript
{
  interpretationName: string;  // Name of interpretation to evaluate
  mukey?: string;             // Map Unit Key (required for now)
  areasymbol?: string;        // Area symbol (not yet implemented)
}
```

**Response:**
```typescript
{
  success: boolean;
  result: InterpretationResult;  // Complete evaluation result
  metadata: {
    mukey: string;
    interpretation: string;
    property_calculation: {
      query_count: number;
      execution_time_ms: number;
      cache_hits?: number;
    };
    total_time_ms: number;
  };
  error?: string;
}
```

**InterpretationResult:**
```typescript
{
  rating: number;              // 0.0 to 1.0
  ratingClass: string;         // "Very Low", "Low", etc.
  tree: RuleTree;              // Evaluation tree with ratings
  evaluationResults: Record<string, number>;
  propertyData: Record<number, any>;
  metadata: {
    propertiesUsed: number;
    evaluationCount: number;
    interpretationName: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/interpret/auto \
  -H "Content-Type: application/json" \
  -d '{
    "interpretationName": "AGR - Pesticide Loss Potential-Soil Surface Runoff",
    "mukey": "462809"
  }'
```

**Response Example:**
```json
{
  "success": true,
  "result": {
    "rating": 0.6640903590634246,
    "ratingClass": "Moderate",
    "tree": { /* ... */ },
    "evaluationResults": { /* ... */ },
    "propertyData": { /* ... */ },
    "metadata": {
      "propertiesUsed": 12,
      "evaluationCount": 27,
      "interpretationName": "AGR - Pesticide Loss Potential-Soil Surface Runoff"
    }
  },
  "metadata": {
    "mukey": "462809",
    "interpretation": "AGR - Pesticide Loss Potential-Soil Surface Runoff",
    "property_calculation": {
      "query_count": 5,
      "execution_time_ms": 1456,
      "cache_hits": 0
    },
    "total_time_ms": 1782
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid parameters
- `404 Not Found` - Interpretation not found
- `500 Internal Server Error` - Property calculation or evaluation failed

---

### 3. Available Properties

Get list of all available soil properties.

**Endpoint:** `GET /api/properties/available`

**Query Parameters:**
- None

**Response:**
```typescript
{
  success: boolean;
  count: number;
  properties: PropertyDefinition[];
}
```

**PropertyDefinition:**
```typescript
{
  propiid: number;
  propname: string;
  propdesc?: string;
  consolidation_key?: string;
  frequency?: number;
}
```

**Example:**
```bash
curl http://localhost:3000/api/properties/available
```

**Response Example:**
```json
{
  "success": true,
  "count": 8096,
  "properties": [
    {
      "propiid": 2,
      "propname": "AASHTO Group Index (GI)",
      "consolidation_key": "comp_texcl_claytotal",
      "frequency": 1247
    },
    ...
  ]
}
```

---

## Performance

### Typical Response Times

**Uncached (First Request):**
- Property Calculation: 0.6 - 1.7 seconds
- Full Auto Interpretation: 1.5 - 3.0 seconds

**Cached (Subsequent Requests):**
- Property Calculation: <100ms
- Full Auto Interpretation: <500ms

### Caching

**Python Service:**
- SQLite-based cache for SDA queries
- TTL: 7 days
- Automatic cache invalidation

**Next.js API:**
- LRU cache for interpretation results
- TTL: 30 minutes
- 1000 entry limit

---

## Error Handling

All endpoints use consistent error format:

```typescript
{
  success: false,
  error: string;           // Human-readable error message
  details?: any;          // Additional error details
  code?: string;          // Error code for programmatic handling
}
```

**Common Error Codes:**
- `INVALID_MUKEY` - MUKEY format invalid
- `INTERPRETATION_NOT_FOUND` - Interpretation doesn't exist
- `PROPERTY_CALC_FAILED` - Python service error
- `SERVICE_UNAVAILABLE` - Python service not reachable
- `TIMEOUT` - Request exceeded timeout (30s)

---

## Rate Limiting

**Development:**
- No rate limiting

**Production:**
- 100 requests per minute per IP
- 429 status code when limit exceeded

---

## Environment Configuration

Required environment variables:

```env
# Python Property Service
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_SERVICE_TIMEOUT=30000

# Optional
PYTHON_SERVICE_RETRIES=3
```

---

## Integration Examples

### TypeScript/JavaScript

```typescript
import { PropertyServiceClient } from '@/lib/services/property-service';

const client = new PropertyServiceClient({
  baseUrl: process.env.PYTHON_SERVICE_URL!,
  timeout: 30000,
});

// Calculate properties
const result = await client.calculateProperties('462809', [2, 3, 4]);

// Auto interpret
const interpretation = await fetch('/api/interpret/auto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interpretationName: 'AGR - Pesticide Loss Potential-Soil Surface Runoff',
    mukey: '462809',
  }),
});
```

### Python

```python
import requests

# Calculate properties
response = requests.post(
    'http://localhost:3000/api/properties/calculate',
    json={
        'mukey': '462809',
        'propertyIds': [2, 3, 4]
    }
)
data = response.json()

# Auto interpret
response = requests.post(
    'http://localhost:3000/api/interpret/auto',
    json={
        'interpretationName': 'AGR - Pesticide Loss Potential-Soil Surface Runoff',
        'mukey': '462809'
    }
)
result = response.json()
```

---

## Comparison: Manual vs Auto Mode

**Manual Mode (Phase 1-4):**
1. User manually enters all property values
2. Instant evaluation (no external calls)
3. No SSURGO data required

**Auto Mode (Phase 5):**
1. User provides only MUKEY
2. System fetches SSURGO data automatically
3. Properties calculated from real soil data
4. Slight latency for SDA queries (~1-2s uncached)
5. Results cached for performance

**When to use each:**
- **Manual:** Teaching, what-if scenarios, custom values
- **Auto:** Production evaluation, batch processing, real-world analysis

---

## See Also

- [Python Service Documentation](../../python-service/README.md)
- [SDA Integration Guide](../../python-service/SDA_INTEGRATION_COMPLETE.md)
- [Integration Checklist](../../INTEGRATION_CHECKLIST_v2.md)
- [Implementation Plan](../../IMPLEMENTATION_PLAN_v2.md)
