export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ message: 'NAVER credentials not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const incoming = new URL(req.url)
  const upstream = new URL('https://openapi.naver.com/v1/search/news.json')
  incoming.searchParams.forEach((v, k) => upstream.searchParams.set(k, v))

  const res = await fetch(upstream.toString(), {
    headers: {
      'X-Naver-Client-Id':     clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  const body = await res.text()
  return new Response(body, {
    status:  res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}