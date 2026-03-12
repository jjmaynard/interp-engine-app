import { NextRequest } from 'next/server'
import { proxyCSBGet } from '@/lib/server/csbProxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    csbid: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { csbid } = await params
  return proxyCSBGet(request, `/api/csb/field/${encodeURIComponent(csbid)}`)
}