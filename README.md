# NRCS Soil Interpretation Engine

A Next.js web application for evaluating NRCS soil interpretations using fuzzy logic and hierarchical rule trees. Features a complete REST API, PostgreSQL database, and production-ready infrastructure.

## Project Overview

This application implements the NRCS soil interpretation methodology, based on the R `InterpretationEngine` package, in a modern web framework. It evaluates soil interpretations using fuzzy logic, providing accurate assessments for agricultural and land use planning.

**Data Source:** The application uses static JSON files for data storage, containing all interpretations, evaluation curves, and property definitions. No database is required.

### Key Features

- ✅ **Fuzzy Logic Evaluation** - Sophisticated interpretation using fuzzy operators and hedges
- ✅ **REST API** - Complete API with validation, caching, and rate limiting
- ✅ **Static JSON Data** - Fast, simple deployment with no database dependencies
- ✅ **Server Actions** - Direct server-side evaluation without HTTP overhead
- ✅ **Result Caching** - LRU in-memory cache for improved performance
- ✅ **Batch Processing** - Evaluate multiple property datasets efficiently
- ✅ **Type-Safe** - Full TypeScript coverage with Zod validation
- ✅ **Interactive Visualizations** - Multiple tree visualization modes
- ✅ **Production Ready** - Error handling, logging, health checks

### Supported Interpretations

Currently loaded: 3 interpretations
- AGR - California Revised Storie Index (CA)
- Dust PM10 and PM2.5 Generation
- Erodibility Factor Maximum

**Data Files:** All data stored in `src/data/` directory
- `interpretation_trees.json` - 3 interpretations with rule trees
- `evaluations.json` - 167,000+ evaluation curve definitions
- `properties.json` - 67,000+ soil property definitions

**Expandable:** Additional interpretations (400+ available) can be added by updating JSON files.

## Technology Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5+
- **Data Storage:** Static JSON files (no database required)
- **Styling:** Tailwind CSS 4
- **Validation:** Zod for runtime type checking
- **Testing:** Jest with 17+ passing tests
- **Caching:** LRU in-memory cache
- **API:** RESTful endpoints + Server Actions
- **Visualization:** React Flow, Recharts, custom D3-based diagrams

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

### Installation

1. Clone and install dependencies:
```bash
cd interp-engine-app
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

**That's it!** No database setup required. All data is loaded from static JSON files.

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
- [x] JSON data loading from static files
- [x] In-memory caching layer (60-minute TTL)
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

### ✅ Phase 4: Interactive Visualizations (COMPLETE)
- [x] Multiple tree visualization modes (Sankey, Interactive, Horizontal, Sunburst, List)
- [x] Pan and zoom controls
- [x] Fullscreen mode
- [x] Rating color coding throughout tree
- [x] Operator label display
- [x] Branch analysis modal
- [x] Fuzzy curve plotting
- [x] Expand/collapse functionality

**Documentation:** [docs/interactive_visualizations.md](docs/interactive_visualizations.md)

### ⏸️ PostgreSQL Integration (PROTOTYPED, NOT ACTIVE)
Database schema files and migrations exist but are not currently used. The application uses static JSON files for simplicity and performance.

**Why JSON instead of database:**
- Simpler deployment (no DB setup)
- Faster data loading (bundled at build)
- No connection/quota limits
- Suitable for current data size (3 interpretations)

**Available if needed:**
- Schema: `src/lib/db/schema.ts`
- Migrations: `drizzle/` directory
- Queries: `src/lib/db/queries.ts`

### ⏳ Phase 5: Future Enhancements (PLANNED)
- [ ] User authentication
- [ ] Saved evaluations
- [ ] CSV batch upload
- [ ] Spatial analysis (GeoJSON)
- [ ] Export to PDF/Excel
- [ ] More interpretations (400+ available)

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

### Database (Available but not used)
- `npm run db:generate` - Generate migrations from schema
- `npm run db:migrate` - Run database migrations
- `npm run db:import` - Import JSON data to PostgreSQL
- `npm run db:setup` - Complete database setup
- `npm run db:studio` - Launch Drizzle Studio GUI

**Note:** Database scripts exist but are not required for normal operation. The app uses static JSON files.

## Data Files

The application loads all data from static JSON files in the `src/data/` directory:

1. **interpretation_trees.json** - Rule trees for 3 interpretations with hierarchical structure
2. **evaluations.json** - 167,000+ evaluation curve definitions for fuzzy logic
3. **properties.json** - 67,000+ soil property definitions

**Adding New Interpretations:**

To add more interpretations, export them from the R `InterpretationEngine` package and add to the JSON files:

```r
library(InterpretationEngine)
interpretation <- initRuleset("Your Interpretation Name")
# Export to JSON format and append to interpretation_trees.json
```

**Current Interpretations:**
1. AGR - California Revised Storie Index (CA)
2. Dust PM10 and PM2.5 Generation
3. Erodibility Factor Maximum

**Capacity:** Can support 400+ interpretations in JSON format (expandable as needed).

## Contributing

See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for the complete development roadmap.

## License

USDA-NRCS

## Documentation

- [Project Summary](docs/PROJECT_SUMMARY.md) - Complete project overview
- [Phase 1 Complete](docs/PHASE1_COMPLETE.md) - Foundation and data loading
- [Phase 2 Complete](docs/PHASE2_COMPLETE.md) - Interpretation engine
- [Phase 3 Complete](docs/PHASE3_COMPLETE.md) - API infrastructure
- [Interactive Visualizations](docs/interactive_visualizations.md) - Tree visualization features
- [Missing Data Analysis](docs/missing_data_analysis.md) - Property data handling
- [Technical Framework](../docs/interp-engine-nextjs-framework.md) - Architecture guide
- [API Reference](docs/API.md) - API documentation (see Phase 3 docs)

## Contact

NRCS Soil Survey Team
