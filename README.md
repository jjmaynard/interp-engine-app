# NRCS Soil Interpretation Engine

A Next.js web application for evaluating NRCS soil interpretations using fuzzy logic and hierarchical rule trees. Features a complete REST API, PostgreSQL database, and production-ready infrastructure.

## Project Overview

This application implements the NRCS soil interpretation methodology, based on the R `InterpretationEngine` package, in a modern web framework. It evaluates soil interpretations using fuzzy logic, providing accurate assessments for agricultural and land use planning.

### Key Features

- ✅ **Fuzzy Logic Evaluation** - Sophisticated interpretation using fuzzy operators and hedges
- ✅ **REST API** - Complete API with validation, caching, and rate limiting
- ✅ **PostgreSQL Database** - Scalable storage for 400+ interpretations
- ✅ **Server Actions** - Direct server-side evaluation without HTTP overhead
- ✅ **Result Caching** - LRU in-memory cache + database-level caching
- ✅ **Batch Processing** - Evaluate multiple property datasets efficiently
- ✅ **Type-Safe** - Full TypeScript coverage with Zod validation
- ✅ **Production Ready** - Error handling, logging, health checks

### Supported Interpretations

Currently loaded: 3 test interpretations
- Erodibility Factor Maximum
- Susceptibility to Compaction
- And more...

**Database Capacity:** All 400+ NRCS interpretations (ready to import)

## Technology Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5+
- **Database:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS 4
- **Validation:** Zod for runtime type checking
- **Testing:** Jest with 17+ passing tests
- **Caching:** LRU cache + PostgreSQL cache table
- **API:** RESTful endpoints + Server Actions

## Project Structure

```
interp-engine-app/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes (Phase 3)
│   │   └── interpret/    # Interpretation page
│   ├── components/       # React components
│   ├── lib/
│   │   ├── engine/       # Core interpretation engine (Phase 2)
│   │   ├── data/         # Data loaders (JSON + DB)
│   │   ├── db/           # Database client and queries (Phase 4)
│   │   ├── actions/      # Server actions (Phase 3)
│   │   ├── validation/   # Zod schemas (Phase 3)
│   │   ├── errors/       # Error handling (Phase 3)
│   │   ├── cache/        # Result caching (Phase 3)
│   │   ├── middleware/   # API middleware (Phase 3)
│   │   └── api/          # API client (Phase 3)
│   ├── types/            # TypeScript definitions (Phase 1)
│   └── __tests__/        # Jest tests (Phase 2-3)
├── data/                 # JSON data files
├── drizzle/              # Database migrations (Phase 4)
├── scripts/              # Database scripts (Phase 4)
├── docs/                 # Documentation
└── public/               # Static assets
```

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or pnpm
- PostgreSQL 14+ (for Phase 4)

### Installation

1. Clone and install dependencies:
```bash
cd interp-engine-app
npm install
```

2. Set up database (optional, see [DATABASE_SETUP.md](DATABASE_SETUP.md)):
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
npm run db:setup
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Data Validation

Verify that data files are loaded correctly:

```typescript
import { validateDataFiles } from '@/lib/data/loader';

const validation = validateDataFiles();
console.log(validation);
```

## Development Status

### ✅ Phase 1: Project Foundation (COMPLETE)

- [x] Next.js project initialized
- [x] TypeScript types defined
- [x] Data loading utilities created
- [x] Caching layer implemented
- [x] Validation utilities created

### 🔄 Phase 2: Interpretation Engine Core (IN PROGRESS)

- [ ] Evaluation functions
- [ ] Operators and hedges
- [ ] Core interpretation engine
- [ ] Unit tests

### ⏳ Phase 3: API and Backend (PLANNED)

- [ ] API routes
- [ ] Server actions
- [ ] Error handling

### ⏳ Phase 4: Frontend Components (PLANNED)

- [ ] Property input forms
- [ ] Results display
- [ ] Navigation

## API Quick Start

### REST API Endpoints

```bash
# List all interpretations
curl http://localhost:3000/api/interpret

# Evaluate an interpretation
curl -X POST http://localhost:3000/api/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "interpretationName": "Erodibility Factor Maximum",
    "propertyData": {
      "K factor, maximum": 0.32,
      "Slope gradient": 5
    }
  }'

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

# Health check
curl http://localhost:3000/api/health

# Cache stats
curl http://localhost:3000/api/cache
```

### Server Actions (Server-Side)

```typescript
import { evaluateInterpretation } from '@/lib/actions/interpretations';

const result = await evaluateInterpretation(
  'Erodibility Factor Maximum',
  { 'K factor, maximum': 0.32, 'Slope gradient': 5 }
);
```

### API Client (Type-Safe)

```typescript
import { apiClient } from '@/lib/api/client';

const result = await apiClient.evaluate(
  'Erodibility Factor Maximum',
  { 'K factor, maximum': 0.32 }
);
```

## Development Status

### ✅ Phase 1: Project Foundation (COMPLETE)
- [x] Next.js 16 with TypeScript
- [x] Type definitions for all data structures
- [x] Data loading utilities
- [x] Caching layer (60-minute TTL)
- [x] Validation utilities with Zod

**Documentation:** [docs/PHASE1_COMPLETE.md](docs/PHASE1_COMPLETE.md)

### ✅ Phase 2: Interpretation Engine Core (COMPLETE)
- [x] Evaluation functions (linear, step, spline, sigmoid, categorical)
- [x] Fuzzy operators (and, or, product, sum, times)
- [x] Hedge functions (not, multiply, power, limit, null handling)
- [x] Tree evaluator with recursive evaluation
- [x] InterpretationEngine class
- [x] 17 passing unit tests

**Documentation:** [docs/PHASE2_COMPLETE.md](docs/PHASE2_COMPLETE.md)

### ✅ Phase 3: API Infrastructure (COMPLETE)
- [x] 8 RESTful API endpoints
- [x] 7 server actions
- [x] Request validation with Zod
- [x] Custom error handling
- [x] LRU result cache (1000 entries, 30-min TTL)
- [x] Rate limiting (100 req/60s per IP)
- [x] Type-safe API client
- [x] Batch processing with cache optimization
- [x] Integration tests

**Documentation:** [docs/PHASE3_COMPLETE.md](docs/PHASE3_COMPLETE.md)

### ✅ Phase 4: PostgreSQL Integration (COMPLETE)
- [x] Database schema with 7 tables
- [x] Drizzle ORM integration
- [x] Connection pooling
- [x] Data migration scripts
- [x] Database query functions
- [x] Database-backed loaders
- [x] Persistent result caching
- [x] npm database scripts

**Documentation:** [docs/PHASE4_COMPLETE.md](docs/PHASE4_COMPLETE.md), [DATABASE_SETUP.md](DATABASE_SETUP.md)

### ⏳ Phase 5: Future Enhancements (PLANNED)
- [ ] Full-text search
- [ ] User authentication
- [ ] Audit logging
- [ ] Spatial data with PostGIS
- [ ] Analytics dashboard
- [ ] GraphQL API
- [ ] Real-time notifications

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Database (Phase 4)
- `npm run db:generate` - Generate migrations from schema
- `npm run db:migrate` - Run database migrations
- `npm run db:import` - Import JSON data to PostgreSQL
- `npm run db:setup` - Complete database setup (all 3 steps)
- `npm run db:studio` - Launch Drizzle Studio GUI
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (Phase 5)

## Data Files

The application uses three main JSON data files:

1. **interpretation_trees.json** - Rule trees for 3 interpretations
2. **evaluations.json** - 167K+ evaluation curve definitions
3. **properties.json** - 67K+ soil property definitions

## Current Interpretations

1. AGR - California Revised Storie Index (CA)
2. Dust PM10 and PM2.5 Generation
3. Erodibility Factor Maximum

## API Endpoints (Phase 3)

Future API endpoints will include:

- `GET /api/interpretations` - List all interpretations
- `GET /api/interpretations/[name]` - Get interpretation details
- `POST /api/interpretations/[name]/evaluate` - Evaluate interpretation

## Contributing

See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for the complete development roadmap.

## License

USDA-NRCS

## Documentation

- [Implementation Plan](../IMPLEMENTATION_PLAN.md)
- [Technical Framework](../docs/interp-engine-nextjs-framework.md)
- [Architecture](../docs/ARCHITECTURE.md) (Coming soon)
- [API Reference](../docs/API.md) (Coming soon)

## Contact

NRCS Soil Survey Team
