# Phase 3: API Infrastructure - Complete ✅

Phase 3 has been successfully implemented, providing a production-ready API layer with comprehensive caching, validation, error handling, and rate limiting.

## Completion Date
2024

## Implemented Components

### 1. API Routes

#### POST /api/interpret
Evaluate a single soil interpretation with caching and rate limiting.

**Request:**
```json
{
  "interpretationName": "Erodibility Factor Maximum",
  "propertyData": {
    "K factor, maximum": 0.32,
    "Slope gradient": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fuzzyValue": 0.75,
    "ratingClass": "Moderate",
    "ratingValue": 0.65,
    "limitationClass": "Moderate"
  },
  "cached": false
}
```

**Features:**
- Request validation with Zod schemas
- LRU result caching (30min TTL)
- Rate limiting (100 req/60s per IP)
- CORS headers
- Comprehensive error handling

#### GET /api/interpret
List all available interpretations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Erodibility Factor Maximum",
      "categoryId": 5,
      "categoryName": "Soil Features"
    }
  ],
  "count": 247
}
```

#### POST /api/interpret/batch
Batch evaluate multiple property datasets with cache optimization.

**Request:**
```json
{
  "interpretationName": "Erodibility Factor Maximum",
  "propertyDataArray": [
    { "K factor, maximum": 0.32, "Slope gradient": 5 },
    { "K factor, maximum": 0.28, "Slope gradient": 3 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "fuzzyValue": 0.75, "ratingClass": "Moderate" },
    { "fuzzyValue": 0.68, "ratingClass": "Moderate" }
  ],
  "metadata": {
    "count": 2,
    "cached": 1,
    "evaluated": 1,
    "durationMs": 45,
    "averageMs": 22.5
  }
}
```

**Cache Optimization:**
1. Checks cache for all records first
2. Builds list of uncached indices/data
3. Evaluates only cache misses
4. Merges cached and new results
5. Caches newly evaluated results
6. Returns metadata with performance stats

#### GET /api/interpret/[name]/properties
Get required properties for an interpretation.

**Response:**
```json
{
  "success": true,
  "data": {
    "interpretationName": "Erodibility Factor Maximum",
    "properties": [
      {
        "id": 42,
        "name": "K factor, maximum",
        "type": "numeric"
      },
      {
        "id": 87,
        "name": "Slope gradient",
        "type": "numeric"
      }
    ]
  }
}
```

#### GET /api/health
Health check endpoint with cache statistics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "interpretations": {
    "count": 247
  },
  "cache": {
    "size": 45,
    "maxSize": 1000,
    "hits": 123,
    "misses": 67,
    "hitRate": 0.647,
    "evictions": 2
  }
}
```

#### GET /api/cache
Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "size": 45,
    "maxSize": 1000,
    "hits": 123,
    "misses": 67,
    "hitRate": 0.647,
    "evictions": 2
  }
}
```

#### DELETE /api/cache
Clear all cached results.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

#### POST /api/cache
Prune expired cache entries.

**Response:**
```json
{
  "success": true,
  "data": {
    "pruned": 12,
    "remaining": 33
  }
}
```

### 2. Server Actions

Located in `src/lib/actions/interpretations.ts`, providing direct server-side access:

```typescript
// Evaluate single interpretation
const result = await evaluateInterpretation(
  'Erodibility Factor Maximum',
  { 'K factor, maximum': 0.32, 'Slope gradient': 5 }
);

// Batch evaluate
const results = await batchEvaluateInterpretation(
  'Erodibility Factor Maximum',
  [propertyData1, propertyData2]
);

// Get available interpretations
const interpretations = await getAvailableInterpretations();

// Get required properties
const properties = await getRequiredProperties('Erodibility Factor Maximum');

// Get interpretation tree
const tree = await getInterpretationTree('Erodibility Factor Maximum');

// Clear engine cache
await clearEngineCache();

// Get cache statistics
const stats = await getCacheStats();
```

**Action Response Format:**
```typescript
interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 3. Validation System

**Zod Schemas** (`src/lib/validation/requests.ts`):
- `PropertyValueSchema`: Validates number, string, or null values
- `PropertyDataSchema`: Record of string keys to property values
- `InterpretRequestSchema`: Single evaluation request
- `BatchInterpretRequestSchema`: Batch evaluation (1-1000 records)

**Validation Functions:**
```typescript
// Validate interpretation request
const result = validateInterpretRequest({
  interpretationName: 'Test',
  propertyData: { prop: 1 }
});

// Validate batch request
const result = validateBatchInterpretRequest({
  interpretationName: 'Test',
  propertyDataArray: [{ prop: 1 }, { prop: 2 }]
});

// Validate required properties
validateRequiredProperties(
  propertyData,
  requiredProperties
);

// Sanitize property data (remove undefined)
const clean = sanitizePropertyData(propertyData);
```

### 4. Error Handling

**Custom Error Classes** (`src/lib/errors/index.ts`):
- `InterpretationEngineError` - Base error (500)
- `InterpretationNotFoundError` - Interpretation not found (404)
- `InvalidPropertyDataError` - Invalid property data (400)
- `MissingPropertiesError` - Required properties missing (400)
- `ValidationError` - Request validation failed (400)
- `EvaluationError` - Evaluation failed (500)

**Error Response Format:**
```json
{
  "error": "Interpretation not found: Invalid Name",
  "message": "The requested interpretation does not exist",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Utilities:**
```typescript
// Format error for API response
const response = formatErrorResponse(error);

// Get HTTP status code for error
const status = getErrorStatusCode(error);

// Log error with context
logError(error, { userId: '123', endpoint: '/api/interpret' });

// Wrap function with error handling
const safeFunction = withErrorHandling(riskyFunction);
```

### 5. Result Caching

**LRU Cache** (`src/lib/cache/results.ts`):
- Max Size: 1000 entries
- TTL: 30 minutes
- Eviction: Least Recently Used (LRU)
- Key Generation: Interpretation name + sorted property data JSON

**Cache Operations:**
```typescript
import { getResultCache } from '@/lib/cache/results';

const cache = getResultCache();

// Get cached result
const result = cache.get(interpretationName, propertyData);

// Cache result
cache.set(interpretationName, propertyData, evaluationResult);

// Get statistics
const stats = cache.getStats();
// { size, maxSize, hits, misses, hitRate, evictions }

// Clear cache
cache.clear();

// Prune expired entries
const pruned = cache.prune();

// Check size
const currentSize = cache.size();
```

**Cache Key Generation:**
- Sorts property keys alphabetically
- Generates JSON string from sorted data
- Combines with interpretation name
- Ensures consistent keys regardless of property order

### 6. API Middleware

**Error Handling** (`src/lib/middleware/api.ts`):
```typescript
// Wrap handler with error handling
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Your handler code
});

// Parse JSON body safely
const body = await parseJsonBody(req);
```

**CORS Headers:**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleOptions();
}
```

**Rate Limiting:**
```typescript
// Check rate limit
const rateLimitResult = checkRateLimit(request);
if (!rateLimitResult.allowed) {
  return rateLimitResponse(rateLimitResult);
}

// Rate limit: 100 requests per 60 seconds per IP
```

### 7. API Client

**Type-Safe Client** (`src/lib/api/client.ts`):
```typescript
import { apiClient } from '@/lib/api/client';

// Evaluate interpretation
const result = await apiClient.evaluate(
  'Erodibility Factor Maximum',
  { 'K factor, maximum': 0.32 }
);

// Batch evaluate
const results = await apiClient.batchEvaluate(
  'Erodibility Factor Maximum',
  [propertyData1, propertyData2]
);

// Get interpretations
const interpretations = await apiClient.getInterpretations();

// Get required properties
const properties = await apiClient.getRequiredProperties(
  'Erodibility Factor Maximum'
);

// Health check
const health = await apiClient.healthCheck();
```

**Features:**
- 30-second timeout with abort controller
- TypeScript interfaces for all responses
- Automatic JSON parsing
- Error handling with typed errors
- Singleton pattern with factory function

### 8. Testing

**API Integration Tests** (`src/__tests__/api.test.ts`):
- Request validation tests
- Batch request validation
- Cache key generation verification

**Test Coverage:**
- Valid request structures
- Invalid request detection
- Empty/missing data handling
- Array validation
- Cache key consistency

## File Structure

```
src/
├── app/
│   └── api/
│       ├── interpret/
│       │   ├── route.ts              # Main evaluation endpoint
│       │   ├── batch/
│       │   │   └── route.ts          # Batch evaluation
│       │   └── [name]/
│       │       └── properties/
│       │           └── route.ts      # Get required properties
│       ├── health/
│       │   └── route.ts              # Health check
│       └── cache/
│           └── route.ts              # Cache management
├── lib/
│   ├── actions/
│   │   └── interpretations.ts        # Server actions
│   ├── validation/
│   │   └── requests.ts               # Zod schemas & validation
│   ├── errors/
│   │   └── index.ts                  # Custom error classes
│   ├── cache/
│   │   └── results.ts                # LRU result cache
│   ├── middleware/
│   │   └── api.ts                    # Error handling, CORS, rate limiting
│   └── api/
│       └── client.ts                 # Type-safe API client
└── __tests__/
    └── api.test.ts                   # API integration tests
```

## Configuration

### Cache Configuration
- **Max Size:** 1000 entries
- **TTL:** 1800 seconds (30 minutes)
- **Eviction:** LRU (Least Recently Used)
- **Key Strategy:** Sorted property data JSON

### Rate Limiting Configuration
- **Window:** 60 seconds
- **Max Requests:** 100 per window
- **Identifier:** Client IP address
- **Storage:** In-memory map

### API Client Configuration
- **Base URL:** `http://localhost:3000/api` (configurable)
- **Timeout:** 30 seconds
- **Retry:** None (add if needed)
- **Headers:** Content-Type: application/json

## Performance Optimizations

### Batch Endpoint Cache Optimization
1. **Check all records in cache first** - Single pass through all property data
2. **Build uncached list** - Track indices and data for cache misses
3. **Evaluate only misses** - Call engine only for uncached records
4. **Merge results** - Combine cached and new results in correct order
5. **Cache new results** - Store newly evaluated results for future use

**Benefits:**
- Reduces unnecessary engine evaluations
- Maintains result order
- Provides cache hit metrics
- Significantly improves performance for repeated evaluations

### Cache Key Generation
- Sorts property keys alphabetically before JSON serialization
- Ensures consistent keys regardless of property insertion order
- Example: `{b:2, a:1}` and `{a:1, b:2}` generate same key

## Error Codes and Responses

| Status | Error Class | Cause |
|--------|------------|-------|
| 400 | ValidationError | Invalid request format |
| 400 | InvalidPropertyDataError | Invalid property values |
| 400 | MissingPropertiesError | Required properties missing |
| 404 | InterpretationNotFoundError | Interpretation doesn't exist |
| 429 | Rate Limit Error | Too many requests |
| 500 | InterpretationEngineError | Internal error |
| 500 | EvaluationError | Evaluation failed |
| 503 | Service Unavailable | Health check failed |

## Usage Examples

### Using API Routes (Client-Side)

```typescript
// Evaluate interpretation
const response = await fetch('/api/interpret', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interpretationName: 'Erodibility Factor Maximum',
    propertyData: {
      'K factor, maximum': 0.32,
      'Slope gradient': 5
    }
  })
});

const result = await response.json();
console.log(result.data.fuzzyValue); // 0.75
console.log(result.cached); // false
```

### Using Server Actions (Server-Side)

```typescript
import { evaluateInterpretation } from '@/lib/actions/interpretations';

const result = await evaluateInterpretation(
  'Erodibility Factor Maximum',
  {
    'K factor, maximum': 0.32,
    'Slope gradient': 5
  }
);

if (result.success) {
  console.log(result.data.fuzzyValue);
}
```

### Using API Client

```typescript
import { apiClient } from '@/lib/api/client';

try {
  const result = await apiClient.evaluate(
    'Erodibility Factor Maximum',
    { 'K factor, maximum': 0.32, 'Slope gradient': 5 }
  );
  console.log(result.fuzzyValue);
} catch (error) {
  console.error('Evaluation failed:', error);
}
```

## Testing the API

### Manual Testing with curl

```bash
# Evaluate interpretation
curl -X POST http://localhost:3000/api/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "interpretationName": "Erodibility Factor Maximum",
    "propertyData": {
      "K factor, maximum": 0.32,
      "Slope gradient": 5
    }
  }'

# List interpretations
curl http://localhost:3000/api/interpret

# Batch evaluate
curl -X POST http://localhost:3000/api/interpret/batch \
  -H "Content-Type: application/json" \
  -d '{
    "interpretationName": "Erodibility Factor Maximum",
    "propertyDataArray": [
      {"K factor, maximum": 0.32, "Slope gradient": 5},
      {"K factor, maximum": 0.28, "Slope gradient": 3}
    ]
  }'

# Get required properties
curl http://localhost:3000/api/interpret/Erodibility%20Factor%20Maximum/properties

# Health check
curl http://localhost:3000/api/health

# Cache stats
curl http://localhost:3000/api/cache

# Clear cache
curl -X DELETE http://localhost:3000/api/cache

# Prune cache
curl -X POST http://localhost:3000/api/cache
```

### Run Integration Tests

```bash
npm test -- api.test.ts
```

## Next Steps (Phase 4)

1. **PostgreSQL Integration**
   - Replace JSON data files with PostgreSQL database
   - Add database migrations
   - Implement database connection pooling
   - Add database-level caching

2. **Authentication & Authorization**
   - Add user authentication
   - Implement API key management
   - Add role-based access control

3. **Advanced Features**
   - Add interpretation comparison endpoints
   - Implement property recommendations
   - Add export functionality (CSV, JSON, PDF)
   - Create interpretation history tracking

4. **Performance Enhancements**
   - Add Redis for distributed caching
   - Implement query result pagination
   - Add database query optimization
   - Implement background job processing

5. **Documentation**
   - Generate OpenAPI/Swagger documentation
   - Create interactive API explorer
   - Add usage examples and tutorials
   - Create deployment guide

## Summary

Phase 3 successfully implements a production-ready API layer for the NRCS Soil Interpretation Engine with:

✅ **5 RESTful API endpoints** with comprehensive error handling
✅ **7 server actions** for direct server-side access
✅ **Request validation** with Zod schemas
✅ **LRU result caching** with 30-minute TTL and cache optimization
✅ **Rate limiting** (100 req/60s per IP)
✅ **CORS support** for cross-origin requests
✅ **Type-safe API client** with timeout handling
✅ **Custom error classes** with appropriate HTTP status codes
✅ **Health check endpoint** with cache statistics
✅ **Cache management** endpoints for monitoring and maintenance
✅ **Batch processing** with cache optimization for performance
✅ **Integration tests** for validation logic

The API is ready for integration with frontend applications and external clients, with robust error handling, caching, and validation to ensure reliable operation at scale.
