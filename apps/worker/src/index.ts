import { RoomDO } from './room'

export { RoomDO }

interface Env {
  ROOMS: DurableObjectNamespace
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
}

function corsResponse(body: string | null, status: number, extra?: HeadersInit): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...(extra || {}) },
  })
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // POST /api/rooms - create a new room
    if (request.method === 'POST' && path === '/api/rooms') {
      const roomId = generateRoomId()
      const id = env.ROOMS.idFromName(roomId)
      const stub = env.ROOMS.get(id)
      // Touch the DO to initialize it
      await stub.fetch(new Request(`https://internal/init`))
      return corsResponse(JSON.stringify({ roomId }), 200)
    }

    // GET /api/rooms/:id/exists
    const existsMatch = path.match(/^\/api\/rooms\/([A-Z0-9]+)\/exists$/)
    if (existsMatch && request.method === 'GET') {
      return corsResponse(JSON.stringify({ exists: true }), 200)
    }

    // GET /api/rooms/:id/ws - WebSocket upgrade
    const wsMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9-]+)\/ws$/)
    if (wsMatch && request.method === 'GET') {
      const roomId = wsMatch[1]
      const upgradeHeader = request.headers.get('Upgrade')
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return corsResponse(JSON.stringify({ error: 'Expected WebSocket upgrade' }), 426)
      }
      const id = env.ROOMS.idFromName(roomId)
      const stub = env.ROOMS.get(id)
      return stub.fetch(request)
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404)
  },
}
