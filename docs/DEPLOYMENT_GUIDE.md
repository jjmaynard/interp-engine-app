# Deployment Guide - Phase 5

**NRCS Soil Interpretation Engine**  
**Multi-Service Deployment**  
**Date:** February 2, 2026

This guide covers deploying both the Next.js application and Python Property Service to production.

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Users/Clients │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js App   │  (Vercel)
                    │  localhost:3000 │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────┐
                    │  Python Service     │  (Railway)
                    │  localhost:8000     │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │   NRCS SDA API      │
                    │   (SSURGO Data)     │
                    └─────────────────────┘
```

---

## Prerequisites

- [ ] GitHub repository set up
- [ ] Vercel account (free tier available)
- [ ] Railway account (free tier available)
- [ ] Domain name (optional, for custom domain)

---

## Part 1: Python Service Deployment (Railway)

### Step 1: Prepare Python Service

**1.1 Update requirements.txt**

```bash
cd python-service
pip freeze > requirements.txt
```

**1.2 Create Procfile**

```bash
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

**1.3 Verify Python version**

Create `runtime.txt`:
```
python-3.11
```

### Step 2: Deploy to Railway

**2.1 Install Railway CLI**

```bash
npm install -g @railway/cli
railway login
```

**2.2 Initialize Railway project**

```bash
cd python-service
railway init
```

**2.3 Set environment variables**

```bash
railway variables set PORT=8000
railway variables set LOG_LEVEL=info
railway variables set CACHE_TTL_HOURS=168
railway variables set ADMIN_API_KEY=<your-secret-key>
```

**2.4 Deploy**

```bash
railway up
```

**2.5 Get deployment URL**

```bash
railway domain
# Example output: https://python-service-production-abc123.up.railway.app
```

### Step 3: Configure Persistent Storage (Optional)

For SQLite cache persistence:

```bash
railway volumes create cache-volume
railway volumes attach cache-volume /app/cache
```

### Step 4: Verify Deployment

```bash
# Health check
curl https://your-python-service.railway.app/health

# Test property calculation
curl -X POST https://your-python-service.railway.app/properties/calculate \
  -H "Content-Type: application/json" \
  -d '{"mukey": "462809", "property_ids": [2, 3, 4]}'
```

---

## Part 2: Next.js Deployment (Vercel)

### Step 1: Prepare Next.js App

**1.1 Update environment variables**

Create `.env.production`:

```env
# Python Service URL (from Railway)
PYTHON_SERVICE_URL=https://your-python-service.railway.app
PYTHON_SERVICE_TIMEOUT=30000

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**1.2 Test production build locally**

```bash
cd interp-engine-app
npm run build
npm start
```

**1.3 Verify build output**

Check for:
- No TypeScript errors
- No build warnings
- All pages pre-rendered successfully

### Step 2: Deploy to Vercel

**2.1 Install Vercel CLI**

```bash
npm install -g vercel
vercel login
```

**2.2 Deploy**

```bash
cd interp-engine-app
vercel
```

Follow prompts:
- Set up and deploy: Yes
- Which scope: Your account/team
- Link to existing project: No
- Project name: interp-engine-app
- Directory: ./
- Override settings: No

**2.3 Set environment variables in Vercel**

Via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add:
   - `PYTHON_SERVICE_URL` = `https://your-python-service.railway.app`
   - `PYTHON_SERVICE_TIMEOUT` = `30000`
3. Select all environments (Production, Preview, Development)
4. Save

**2.4 Redeploy with environment variables**

```bash
vercel --prod
```

### Step 3: Verify Deployment

```bash
# Your Vercel URL will be provided after deployment
# Example: https://interp-engine-app.vercel.app

# Test health
curl https://your-app.vercel.app/api/health

# Test auto interpretation
curl -X POST https://your-app.vercel.app/api/interpret/auto \
  -H "Content-Type: application/json" \
  -d '{
    "interpretationName": "AGR - Pesticide Loss Potential-Soil Surface Runoff",
    "mukey": "462809"
  }'
```

---

## Part 3: Custom Domain Setup (Optional)

### For Next.js (Vercel)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `soilinterpretations.example.com`
3. Follow DNS configuration instructions
4. Add CNAME record pointing to `cname.vercel-dns.com`

### For Python Service (Railway)

1. Go to Railway Dashboard → Project → Settings → Domains
2. Add custom domain: `api.soilinterpretations.example.com`
3. Add CNAME record pointing to Railway's domain

**Update Next.js environment:**
```bash
vercel env add PYTHON_SERVICE_URL production
# Enter: https://api.soilinterpretations.example.com
```

---

## Part 4: Monitoring & Maintenance

### Health Checks

**Next.js:**
```bash
curl https://your-app.vercel.app/api/health
```

**Python Service:**
```bash
curl https://your-python-service.railway.app/health
```

### Log Monitoring

**Railway:**
```bash
railway logs
```

**Vercel:**
- View logs in Vercel Dashboard → Deployments → Function Logs

### Performance Monitoring

**Python Service Metrics:**
```bash
curl https://your-python-service.railway.app/health
```

Returns:
```json
{
  "status": "healthy",
  "uptime_seconds": 123456,
  "data": {
    "properties_loaded": 8096,
    "consolidation_groups": 444
  }
}
```

**Next.js Monitoring:**
- Enable Vercel Analytics in dashboard
- Monitor Web Vitals
- Track API response times

### Cache Management

**Clear Python cache:**
```bash
curl -X POST https://your-python-service.railway.app/admin/reload-data \
  -H "X-API-Key: your-admin-key"
```

---

## Part 5: Scaling Considerations

### Railway (Python Service)

**Vertical Scaling:**
- Upgrade Railway plan for more memory/CPU
- Recommended: $5/month plan (512MB → 1GB RAM)

**Horizontal Scaling:**
- Railway supports multiple instances
- Add Redis for shared caching (optional)

### Vercel (Next.js)

**Automatic Scaling:**
- Vercel auto-scales based on traffic
- Edge functions for global distribution
- No configuration needed

**Optimize Bundle Size:**
```bash
npm run build
# Check bundle size in output
# Optimize large dependencies if needed
```

---

## Part 6: Backup & Recovery

### Data Files

**Automated Backup:**
```bash
# Add to cron job
./scripts/sync-data.sh
git add data/
git commit -m "Backup data files"
git push
```

### Database

No traditional database - all data in static JSON files:
- Committed to git repository
- Backed up with code
- Easy rollback via git

### Cache

SQLite cache is ephemeral:
- Rebuilds automatically on cache miss
- No backup needed
- Can be cleared safely

---

## Part 7: Rollback Procedure

### Rollback Next.js

**Via Vercel Dashboard:**
1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"

**Via CLI:**
```bash
vercel rollback
```

### Rollback Python Service

**Via Railway Dashboard:**
1. Go to Deployments
2. Select previous deployment
3. Click "Redeploy"

**Via CLI:**
```bash
railway rollback
```

---

## Part 8: Cost Estimate

### Free Tier (Development/Testing)

**Vercel:**
- Free for hobby projects
- 100GB bandwidth/month
- Unlimited deployments

**Railway:**
- $5 credit/month (free)
- ~500 hours/month free
- Enough for development

**Total: $0/month**

### Production Tier

**Vercel Pro:**
- $20/month
- 1TB bandwidth
- Analytics included

**Railway Hobby:**
- $5-20/month
- Based on usage
- Includes persistence

**Total: ~$30-40/month**

---

## Part 9: Security Checklist

- [ ] Environment variables set (not committed to git)
- [ ] Admin API key changed from default
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic on Vercel/Railway)
- [ ] Error messages don't expose sensitive info
- [ ] API authentication implemented (if needed)
- [ ] Logs don't contain credentials

---

## Part 10: Troubleshooting

### Common Issues

**1. "Python service not reachable"**
- Verify `PYTHON_SERVICE_URL` in Next.js environment
- Check Railway deployment status
- Test Python service health endpoint

**2. "Build failed"**
- Check build logs for TypeScript errors
- Ensure all dependencies in package.json
- Verify Node version compatibility

**3. "Slow response times"**
- Check SDA API status
- Verify cache is working
- Consider upgrading Railway plan

**4. "Cache not working"**
- Check SQLite file permissions
- Verify cache directory exists
- Check cache TTL settings

---

## Support

**Documentation:**
- [API Reference](./API_REFERENCE_PHASE5.md)
- [Integration Checklist](../../INTEGRATION_CHECKLIST_v2.md)
- [Implementation Plan](../../IMPLEMENTATION_PLAN_v2.md)

**External Resources:**
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
