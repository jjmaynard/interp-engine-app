import { NextRequest, NextResponse } from 'next/server'

const GEE_BASE_URL =
  process.env.GEE_API_URL ||
  process.env.NEXT_PUBLIC_GEE_API_URL ||
  'https://gee-api-production.up.railway.app'

export async function proxyCSBGet(request: NextRequest, upstreamPath: string): Promise<NextResponse> {
  try {
    const upstreamUrl = new URL(upstreamPath, GEE_BASE_URL)

    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value)
    })

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
    })

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json'

    if (contentType.includes('application/json')) {
      const json = await upstreamResponse.json()
      return NextResponse.json(json, { status: upstreamResponse.status })
    }

    const text = await upstreamResponse.text()
    return new NextResponse(text, {
      status: upstreamResponse.status,
      headers: {
        'content-type': contentType,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error'
    return NextResponse.json(
      {
        error: 'Failed to reach CSB upstream service',
        details: message,
      },
      { status: 502 }
    )
  }
}