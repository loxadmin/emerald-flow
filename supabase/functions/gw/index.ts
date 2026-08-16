import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const ORIGIN = Deno.env.get('SUPABASE_URL')!

const ALLOWED_PREFIXES = ['/rest/v1/', '/storage/v1/', '/functions/v1/']

const FORWARD_REQ_HEADERS = [
  'authorization',
  'apikey',
  'accept',
  'accept-profile',
  'content-profile',
  'content-type',
  'prefer',
  'range',
  'range-unit',
  'x-client-info',
  'x-upsert',
]

const FORWARD_RES_HEADERS = [
  'content-type',
  'content-range',
  'content-profile',
  'content-location',
  'range-unit',
  'preference-applied',
  'etag',
  'location',
  'x-total-count',
]

const MASK_KEY = 'k7pQ2xVr9Lm4Zt'

function scramble(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    out += String.fromCharCode(value.charCodeAt(i) ^ MASK_KEY.charCodeAt(i % MASK_KEY.length))
  }
  return out
}

function decodePath(token: string): string | null {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
    return decodeURIComponent(escape(scramble(atob(b64 + pad))))
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers':
          req.headers.get('access-control-request-headers') ?? FORWARD_REQ_HEADERS.join(', '),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Expose-Headers': '*',
      },
    })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('k')
  if (!token) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const path = decodePath(token)
  if (
    !path ||
    !path.startsWith('/') ||
    path.includes('..') ||
    !ALLOWED_PREFIXES.some((p) => path.startsWith(p)) ||
    path.startsWith('/functions/v1/gw')
  ) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const headers = new Headers()
  for (const name of FORWARD_REQ_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }

  const init: RequestInit = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(`${ORIGIN}${path}`, init)
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_unreachable' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const out = new Headers({ ...corsHeaders, 'Access-Control-Expose-Headers': '*' })
  for (const name of FORWARD_RES_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }

  return new Response(upstream.body, { status: upstream.status, headers: out })
})
