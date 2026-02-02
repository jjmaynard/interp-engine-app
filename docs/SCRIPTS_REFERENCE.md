# Scripts Reference Guide

This document provides a comprehensive overview of all utility scripts in the `/scripts` directory, their purpose, usage, and when to run them.

---

## Overview

The scripts directory contains 9 utility scripts organized into three main categories:

1. **Data Import/Migration** - Scripts for importing data from external sources into the database
2. **Data Processing** - Scripts for transforming and updating data
3. **Diagnostic Tools** - Scripts for inspecting and debugging data

---

## Data Import/Migration Scripts

### 1. `migrate.ts`

**Purpose:** Runs Drizzle ORM database migrations to create/update the PostgreSQL schema.

**When to Use:**
- Initial database setup
- After modifying database schema files
- When deploying to a new environment

**Dependencies:**
- PostgreSQL database accessible via `DATABASE_URL` environment variable
- Migration files in `/drizzle` directory

**Usage:**
```bash
npx tsx scripts/migrate.ts
```

**Output:**
- Creates or updates database tables according to schema
- Applies pending migrations

**Notes:**
- Must be run before any other database operations
- Safe to run multiple times (only applies new migrations)

---

### 2. `import-data.ts`

**Purpose:** Comprehensive data import script that migrates JSON data files to PostgreSQL database.

**When to Use:**
- Initial database setup after running migrations
- Re-importing data after database reset
- Importing updated data exports

**Data Imported:**
- Categories (interpretation categories)
- Properties (soil properties with units, ranges)
- Evaluations (fuzzy membership functions and crisp expressions)
- Interpretations (interpretation trees and rules)
- Junction tables (interpretation-property and interpretation-evaluation relationships)

**Usage:**
```bash
npx tsx scripts/import-data.ts
```

**Input Files:**
- `data/evaluations.json`
- `data/properties.json`
- `data/interpretation_trees.json`

**Output:**
- Populated database with complete interpretation engine data
- Progress logging during import
- Summary statistics

**Notes:**
- Expects data files in `/data` directory
- Creates relationships between interpretations, properties, and evaluations
- Skips existing records to avoid duplicates

---

### 3. `import-all-interpretations.ts`

**Purpose:** Imports the complete NASIS interpretation database (2,113+ interpretations) from R script exports.

**When to Use:**
- After running `export_all_nasis_interpretations.R`
- Initial import of complete NASIS data
- Updating interpretations with new NASIS data

**Features:**
- Batch processing (50 interpretations per batch)
- Category auto-detection from interpretation names
- Progress tracking and statistics
- Category breakdown analysis

**Usage:**
```bash
npx tsx scripts/import-all-interpretations.ts
```

**Input File:**
- `../data/primary_interpretation_trees.json` (from R script)

**Output:**
- 2,113+ interpretations imported
- Properties linked via junction table
- Category statistics
- Error reporting for failed imports

**Statistics Provided:**
- Total interpretations processed
- Success/skip/failure counts
- Import speed (interps/sec)
- Breakdown by category (top 20)

**Notes:**
- Generates numeric `interpid` from interpretation name hash
- Links properties found in the interpretation tree
- Stores tree structure directly as JSONB

---

## Data Processing Scripts

### 4. `update-local-evaluations.ts`

**Purpose:** Parses XML data from the `eval` field in `evaluations.json` and populates `points`, `interpolation`, and `crispExpression` fields.

**When to Use:**
- After receiving new evaluation data with XML `eval` fields
- When fuzzy membership functions need to be extracted from XML
- After updating evaluations.json from NASIS export

**Process:**
1. Reads `data/evaluations.json`
2. Parses XML `<DomainPoints>`, `<RangePoints>`, `<CrispExpression>` elements
3. Converts to `{x, y}` point arrays for fuzzy curves
4. Determines interpolation type (linear, spline, sigmoid)
5. Extracts crisp expressions for categorical evaluations
6. Writes updated data back to same file

**Usage:**
```bash
npx tsx scripts/update-local-evaluations.ts
```

**Input/Output File:**
- `data/evaluations.json` (reads and writes to same file)

**Output Statistics:**
- Total evaluations processed
- Count with fuzzy curves
- Count with crisp expressions

**Special Handling:**
- Sigmoid curves with empty RangePoints (distributes y-values 0-1)
- Supports multiple evaluation types (arbitrarycurve, linear, trapezoid, etc.)

**Notes:**
- **CRITICAL:** This script writes to `data/evaluations.json`
- App loads from `src/data/evaluations.json`
- **After running, must copy updated file:**
  ```bash
  cp data/evaluations.json src/data/evaluations.json
  ```

---

### 5. `reimport-evaluations.ts`

**Purpose:** Database version of `update-local-evaluations.ts` - updates evaluations in PostgreSQL with parsed XML data.

**When to Use:**
- When using database-backed approach instead of JSON files
- After importing evaluations that have XML data
- To populate `points`, `interpolation`, `crispExpression` in database

**Process:**
1. Loads `evaluations.json` from data directory
2. Parses XML for each evaluation
3. Updates database records with parsed data

**Usage:**
```bash
npx tsx scripts/reimport-evaluations.ts
```

**Dependencies:**
- PostgreSQL database connection
- Evaluations already imported to database
- `data/evaluations.json` file

**Output Statistics:**
- Updated evaluation count
- Count with fuzzy curves
- Skipped/error counts

**Notes:**
- Use `update-local-evaluations.ts` if working with JSON files
- Use `reimport-evaluations.ts` if working with database

---

### 6. `fix-interpretations-data.ts`

**Purpose:** Updates existing interpretations in database to include full object structure (tree, properties, property_count) in `treeStructure` field.

**When to Use:**
- After schema changes to interpretation storage format
- Migrating from old structure to new structure
- When interpretations only have tree array but missing properties

**Process:**
1. Loads `src/data/primary_interpretation_trees.json`
2. Finds matching interpretations in database by name
3. Updates `treeStructure` to include full object with properties

**Usage:**
```bash
npx tsx scripts/fix-interpretations-data.ts
```

**Input File:**
- `src/data/primary_interpretation_trees.json`

**Database Updates:**
- Sets `treeStructure` to `{tree, properties, property_count}`

**Notes:**
- One-time migration script
- Reports not-found interpretations
- Progress updates every 100 interpretations

---

### 7. `export-to-json.ts`

**Purpose:** Exports database data back to static JSON files.

**When to Use:**
- After updating data in database
- Creating backups of database data
- Migrating from database to JSON file approach
- After running `reimport-evaluations.ts` to export updated evaluations

**Exports:**
- `data/evaluations.json` - All evaluations with parsed points
- `data/properties.json` - All properties
- `data/interpretation_trees.json` - All interpretations

**Usage:**
```bash
npx tsx scripts/export-to-json.ts
```

**Output:**
- JSON files in `/data` directory
- Count of records exported for each type

**Notes:**
- Overwrites existing JSON files
- Useful for creating static data after database updates
- Remember to copy to `src/data/` if using JSON file approach

---

## Diagnostic Tools

### 8. `check-interpretation.ts`

**Purpose:** Comprehensive diagnostic tool for checking interpretation data integrity and structure.

**When to Use:**
- Debugging interpretation evaluation issues
- Verifying data relationships
- Understanding interpretation structure
- Investigating missing properties or evaluations

**Checks Performed:**
1. Interpretation exists in database
2. Associated properties via junction table
3. Rule tree structure and node types
4. Evaluation references in tree
5. Evaluation records exist and link to properties
6. Properties are in correct format

**Usage:**
```bash
npx tsx scripts/check-interpretation.ts
```

**Interactive:**
- Prompts for interpretation name
- Can be modified to accept command-line argument

**Output Information:**
- Interpretation ID and metadata
- Property count and list (first 5)
- Rule tree node count and structure
- Evaluation references in tree
- Sample evaluation details
- Diagnostic warnings

**Notes:**
- Excellent for troubleshooting
- Shows data flow: interpretation → tree → evaluations → properties
- Identifies missing links or data issues

---

### 9. `list-interpretations.ts`

**Purpose:** Quick listing of all interpretations with property counts.

**When to Use:**
- Getting overview of available interpretations
- Verifying import success
- Checking property counts
- Finding interpretation names for testing

**Usage:**
```bash
npx tsx scripts/list-interpretations.ts
```

**Output:**
- List of interpretations (limited to 50)
- Interpretation ID and interpid
- Property count for each
- Total count

**Notes:**
- Quick reference tool
- Uses SQL aggregation for property counts
- Ordered alphabetically by name

---

## Common Workflows

### Initial Setup (Database Approach)

```bash
# 1. Create database schema
npx tsx scripts/migrate.ts

# 2. Import all data
npx tsx scripts/import-data.ts

# 3. Parse evaluation XML and update database
npx tsx scripts/reimport-evaluations.ts

# 4. Verify import
npx tsx scripts/list-interpretations.ts
```

### Initial Setup (JSON File Approach - Current)

```bash
# 1. Parse evaluation XML in JSON file
npx tsx scripts/update-local-evaluations.ts

# 2. Copy updated file to app data directory
cp data/evaluations.json src/data/evaluations.json

# 3. Start app (loads from src/data/*.json files)
npm run dev
```

### Updating Data from R Scripts

```bash
# After running R export scripts:

# 1. Import new interpretations
npx tsx scripts/import-all-interpretations.ts

# 2. If evaluations updated, parse XML
npx tsx scripts/update-local-evaluations.ts
cp data/evaluations.json src/data/evaluations.json

# 3. Restart Next.js to reload data
```

### Migrating from Database to JSON Files

```bash
# 1. Update data in database (if needed)
npx tsx scripts/reimport-evaluations.ts

# 2. Export to JSON files
npx tsx scripts/export-to-json.ts

# 3. Copy to src/data directory
cp data/evaluations.json src/data/evaluations.json
cp data/properties.json src/data/properties.json
cp data/interpretation_trees.json src/data/interpretation_trees.json
```

### Debugging Interpretation Issues

```bash
# 1. Check specific interpretation
npx tsx scripts/check-interpretation.ts
# (enter interpretation name when prompted)

# 2. List all interpretations to find correct name
npx tsx scripts/list-interpretations.ts

# 3. Verify evaluation data has points
jq '.[0] | {evaliid, hasPoints: (.points != null)}' data/evaluations.json
```

---

## File Paths Reference

### Input Data Locations
- `data/evaluations.json` - Source evaluation data from R scripts
- `data/properties.json` - Source property data from R scripts
- `data/interpretation_trees.json` - Source interpretation trees from R scripts
- `../data/primary_interpretation_trees.json` - NASIS export from R scripts

### App Data Locations (Where app loads from)
- `src/data/evaluations.json` - Runtime evaluation data
- `src/data/properties.json` - Runtime property data
- `src/data/interpretation_trees.json` - Runtime interpretation trees

### Critical Note
Several scripts write to `data/` directory but the app loads from `src/data/` directory. Always copy updated files:

```bash
cp data/evaluations.json src/data/evaluations.json
```

---

## Environment Variables Required

All database scripts require:
- `DATABASE_URL` - PostgreSQL connection string

Example `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/interp_engine
```

---

## Troubleshooting

### "Evaluations showing 0%"
1. Run `update-local-evaluations.ts` to parse XML
2. Copy `data/evaluations.json` to `src/data/evaluations.json`
3. Restart Next.js dev server

### "Interpretation not found"
1. Verify interpretations imported: `list-interpretations.ts`
2. Check data files exist in `src/data/`
3. Run `import-all-interpretations.ts` if needed

### "Property count mismatch"
- Property count in static data may differ from tree traversal
- Tree traversal count is accurate (used by engine)
- Selector component now hides static count to avoid confusion

### "Database connection failed"
1. Check `DATABASE_URL` in `.env` file
2. Verify PostgreSQL is running
3. Test connection: `npx tsx scripts/migrate.ts`

---

## Summary Matrix

| Script | Type | Database | JSON Files | When to Use |
|--------|------|----------|------------|-------------|
| migrate.ts | Setup | ✓ | - | Initial DB setup, schema changes |
| import-data.ts | Import | ✓ | Read | Import data to DB |
| import-all-interpretations.ts | Import | ✓ | Read | Import NASIS exports |
| update-local-evaluations.ts | Process | - | R/W | Parse XML in JSON files |
| reimport-evaluations.ts | Process | ✓ | Read | Parse XML to DB |
| fix-interpretations-data.ts | Process | ✓ | Read | Fix interpretation structure |
| export-to-json.ts | Export | Read | ✓ | DB → JSON files |
| check-interpretation.ts | Debug | ✓ | - | Diagnose data issues |
| list-interpretations.ts | Debug | ✓ | - | List all interpretations |

---

## Maintenance Schedule

### After R Script Updates
- Run `update-local-evaluations.ts` if evaluations changed
- Run `import-all-interpretations.ts` if interpretations changed
- Copy updated files to `src/data/`

### Schema Changes
- Update schema files in `src/lib/db/schema.ts`
- Generate migration: `npx drizzle-kit generate`
- Run `migrate.ts`

### Production Deployment
- Ensure `src/data/*.json` files have latest data
- Run `update-local-evaluations.ts` before deployment if needed
- Build: `npm run build`

---

*Last Updated: January 31, 2026*
