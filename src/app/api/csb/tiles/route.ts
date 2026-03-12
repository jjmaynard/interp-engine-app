import { NextRequest } from 'next/server'
import { proxyCSBGet } from '@/lib/server/csbProxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyCSBGet(request, '/api/csb/tiles')
}