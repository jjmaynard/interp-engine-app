# Database Setup Guide

This guide will help you set up PostgreSQL and migrate the NRCS Soil Interpretation Engine data from JSON to database.

## Quick Start

```bash
# 1. Install dependencies (already done)
npm install

# 2. Set up PostgreSQL database
# See "PostgreSQL Installation" below

# 3. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL

# 4. Run complete database setup
npm run db:setup
```

That's it! Your database is now ready.

## Detailed Instructions

### Step 1: Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### Step 2: Create Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Or on Windows/macOS
psql -U postgres
```

```sql
-- Create database
CREATE DATABASE interp_engine;

-- Create user (optional)
CREATE USER interp_user WITH PASSWORD 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE interp_engine TO interp_user;

-- Exit
\q
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and set your DATABASE_URL:

```env
# For user created above:
DATABASE_URL="postgresql://interp_user:your_secure_password@localhost:5432/interp_engine"

# Or with default postgres user:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interp_engine"

# Connection pool settings (optional)
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Step 4: Run Database Setup

#### Option A: Complete Setup (Recommended)
```bash
# Generates migrations, creates tables, and imports data
npm run db:setup
```

#### Option B: Step-by-Step
```bash
# 1. Generate migration files from schema
npm run db:generate

# 2. Run migrations (create tables)
npm run db:migrate

# 3. Import data from JSON files
npm run db:import
```

### Step 5: Verify Setup

```bash
# Connect to database
psql -U interp_user -d interp_engine

# Or with postgres user
psql -U postgres -d interp_engine
```

```sql
-- List all tables
\dt

-- Check record counts
SELECT COUNT(*) FROM categories;        -- Should be 8
SELECT COUNT(*) FROM interpretations;   -- Should be 3+
SELECT COUNT(*) FROM properties;        -- Should be ~67,000
SELECT COUNT(*) FROM evaluations;       -- Should be ~167,000

-- View sample data
SELECT name FROM interpretations;
SELECT name FROM categories;

-- Exit
\q
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** PostgreSQL is not running. Start it:
```bash
# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql@16

# Windows
# Start via Services app or pgAdmin
```

### Authentication Failed
```
Error: password authentication failed for user "postgres"
```

**Solution:** Reset PostgreSQL password:
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q
```

Update `.env` with the new password.

### Database Does Not Exist
```
Error: database "interp_engine" does not exist
```

**Solution:** Create the database:
```bash
psql -U postgres
CREATE DATABASE interp_engine;
\q
```

### Permission Denied
```
Error: permission denied for schema public
```

**Solution:** Grant permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE interp_engine TO interp_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO interp_user;
```

### Import Hangs
If data import seems stuck:
1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Ensure enough disk space
3. Run import with verbose logging: `npm run db:import 2>&1 | tee import.log`

## Database Management

### View Database in Browser

```bash
# Launch Drizzle Studio
npm run db:studio

# Opens at http://localhost:4983
```

### Backup Database

```bash
# Backup to file
pg_dump -U interp_user interp_engine > backup.sql

# With compression
pg_dump -U interp_user interp_engine | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
psql -U interp_user interp_engine < backup.sql

# From compressed backup
gunzip -c backup.sql.gz | psql -U interp_user interp_engine
```

### Reset Database

```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE interp_engine;
CREATE DATABASE interp_engine;
GRANT ALL PRIVILEGES ON DATABASE interp_engine TO interp_user;
\q

# Run setup again
npm run db:setup
```

### Clear Cache

```sql
-- Connect to database
psql -U interp_user interp_engine

-- Clear all cache entries
TRUNCATE evaluation_results_cache;

-- Or delete only expired entries
DELETE FROM evaluation_results_cache WHERE expires_at <= NOW();
```

## Cloud Database Setup

### Neon (Recommended for Serverless)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
   ```
5. Run migrations:
   ```bash
   npm run db:migrate
   npm run db:import
   ```

### Vercel Postgres

1. Create Vercel project
2. Add Postgres storage
3. Copy environment variables to `.env`:
   ```env
   POSTGRES_URL="..."
   POSTGRES_URL_NON_POOLING="..."
   ```
4. Use POSTGRES_URL for migrations:
   ```bash
   DATABASE_URL=$POSTGRES_URL npm run db:setup
   ```

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database
3. Copy connection string (use "Connection pooling")
4. Update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.xxx:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   ```
5. Run setup:
   ```bash
   npm run db:setup
   ```

### Railway

1. Create project at [railway.app](https://railway.app)
2. Add PostgreSQL service
3. Copy DATABASE_URL from Variables tab
4. Update `.env`
5. Run setup

## Performance Tuning

### Increase Pool Size (Production)

```env
DB_POOL_MIN=5
DB_POOL_MAX=20
```

### Enable Query Logging

```typescript
// In src/lib/db/client.ts
const pool = new Pool({
  connectionString,
  min: 5,
  max: 20,
  log: (msg) => console.log('DB:', msg), // Add this
});
```

### Monitor Connections

```sql
-- Show active connections
SELECT * FROM pg_stat_activity WHERE datname = 'interp_engine';

-- Connection count
SELECT count(*) FROM pg_stat_activity WHERE datname = 'interp_engine';
```

### Analyze Query Performance

```sql
-- Explain query plan
EXPLAIN ANALYZE 
SELECT * FROM interpretations WHERE name = 'Erodibility Factor Maximum';

-- Show slow queries (requires pg_stat_statements extension)
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Development Workflow

### Schema Changes

```bash
# 1. Edit src/lib/db/schema.ts
# 2. Generate new migration
npm run db:generate

# 3. Review generated SQL in drizzle/ folder
# 4. Apply migration
npm run db:migrate
```

### Test Data

```bash
# Drop and recreate with fresh data
psql -U postgres
DROP DATABASE interp_engine;
CREATE DATABASE interp_engine;
\q

npm run db:setup
```

## Security Best Practices

1. **Never commit `.env`** - Already in .gitignore
2. **Use strong passwords** - Minimum 16 characters
3. **Enable SSL in production** - Add `?sslmode=require` to DATABASE_URL
4. **Limit connection pool size** - Prevent resource exhaustion
5. **Use read-only users** - For reporting/analytics
6. **Regular backups** - Automate daily backups
7. **Monitor access** - Review pg_stat_activity regularly

## Support

For issues:
1. Check [PostgreSQL documentation](https://www.postgresql.org/docs/)
2. Review Drizzle ORM docs at [orm.drizzle.team](https://orm.drizzle.team)
3. Check application logs
4. Verify DATABASE_URL is correct
5. Ensure PostgreSQL is running and accepting connections

## Next Steps

After database setup:
1. Start development server: `npm run dev`
2. Test API endpoints: Visit http://localhost:3000/api/interpret
3. View interpretations: http://localhost:3000/interpret
4. Monitor with Drizzle Studio: `npm run db:studio`

Database is now ready for development! 🎉
