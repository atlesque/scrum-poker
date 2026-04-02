import type { ClientMessage, Player, RoomSettings, RoomState, ServerMessage, VoteResult } from '@scrum-poker/shared'
import { computed, onUnmounted, ref } from 'vue'

const SESSION_CLIENT_ID = 'scrum-poker-client-id'
const STORAGE_PLAYER_NAME = 'scrum-poker-player-name'

export function useRoom(roomId: string) {
  const runtimeConfig = useRuntimeConfig()
  const workerUrl = runtimeConfig.public.workerUrl as string

  const ws = ref<WebSocket | null>(null)
  const roomState = ref<RoomState | null>(null)
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const notifications = ref<string[]>([])
  const voteResults = ref<VoteResult[] | null>(null)
  const bannedUntil = ref<number | null>(null)
  const clientId = ref<string>('')
  const playerName = ref<string>('')

  const INITIAL_RECONNECT_DELAY_MS = 1000
  const MAX_RECONNECT_DELAY_MS = 30000

  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let pendingName: string | null = null

  function initClientId() {
    if (typeof window === 'undefined') return
    let id = sessionStorage.getItem(SESSION_CLIENT_ID)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_CLIENT_ID, id)
    }
    clientId.value = id

    const savedName = localStorage.getItem(STORAGE_PLAYER_NAME)
    if (savedName) playerName.value = savedName
  }

  function getWsUrl(): string {
    const base = workerUrl.replace(/^http/, 'ws')
    return `${base}/api/rooms/${roomId}/ws`
  }

  function send(msg: ClientMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg))
    }
  }

  function connect() {
    if (ws.value && (ws.value.readyState === WebSocket.CONNECTING || ws.value.readyState === WebSocket.OPEN)) return
    connectionStatus.value = 'connecting'

    try {
      const socket = new WebSocket(getWsUrl())
      ws.value = socket

      socket.onopen = () => {
        connectionStatus.value = 'connected'
        reconnectAttempts = 0
        startPing()
        // Re-join if we have a name
        const name = pendingName || playerName.value
        if (name && clientId.value) {
          socket.send(JSON.stringify({ type: 'join', name, clientId: clientId.value }))
        }
      }

      socket.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data)
          handleServerMessage(msg)
        } catch {
          // ignore parse errors
        }
      }

      socket.onclose = (event) => {
        stopPing()
        if (event.code === 1008) {
          // Banned or kicked - don't reconnect
          connectionStatus.value = 'disconnected'
          return
        }
        connectionStatus.value = 'disconnected'
        scheduleReconnect()
      }

      socket.onerror = () => {
        connectionStatus.value = 'error'
        socket.close()
      }
    } catch {
      connectionStatus.value = 'error'
    }
  }

  function scheduleReconnect() {
    if (bannedUntil.value) return
    const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS)
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  function startPing() {
    pingInterval = setInterval(() => {
      send({ type: 'ping' })
    }, 30000)
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'room-state':
        roomState.value = msg.state
        break
      case 'player-joined':
        if (roomState.value) {
          const idx = roomState.value.players.findIndex(p => p.id === msg.player.id)
          if (idx === -1) {
            roomState.value.players.push(msg.player)
          } else {
            roomState.value.players[idx] = msg.player
          }
        }
        break
      case 'player-left':
        if (roomState.value) {
          roomState.value.players = roomState.value.players.filter(p => p.id !== msg.playerId)
        }
        addNotification(`${msg.name} left`)
        break
      case 'player-voted':
        if (roomState.value) {
          const player = roomState.value.players.find(p => p.id === msg.playerId)
          if (player) player.hasVoted = true
        }
        break
      case 'vote-revealed':
        voteResults.value = msg.results
        roomState.value = msg.state
        break
      case 'reset':
        roomState.value = msg.state
        voteResults.value = null
        break
      case 'kicked':
        roomState.value = null
        connectionStatus.value = 'disconnected'
        addNotification('You were kicked from the room')
        ws.value?.close()
        break
      case 'banned':
        bannedUntil.value = msg.until
        roomState.value = null
        connectionStatus.value = 'disconnected'
        ws.value?.close()
        break
      case 'notification':
        addNotification(msg.message)
        break
      case 'error':
        addNotification(`Error: ${msg.message}`)
        break
      case 'pong':
        break
    }
  }

  function addNotification(message: string) {
    notifications.value = [message, ...notifications.value].slice(0, 5)
    // Auto-remove after 4 seconds
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n !== message)
    }, 4000)
  }

  function join(name: string) {
    if (!clientId.value) initClientId()
    playerName.value = name
    pendingName = name
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PLAYER_NAME, name)
    }
    if (ws.value?.readyState === WebSocket.OPEN) {
      send({ type: 'join', name, clientId: clientId.value })
    } else {
      connect()
    }
  }

  function reconnect() {
    reconnectAttempts = 0
    bannedUntil.value = null
    connect()
  }

  const myPlayer = computed((): Player | null => {
    if (!roomState.value || !clientId.value) return null
    return roomState.value.players.find(p => p.clientId === clientId.value) ?? null
  })

  // Actions
  function sendVote(card: string) { send({ type: 'vote', card }) }
  function sendReveal() { send({ type: 'reveal' }) }
  function sendReset() { send({ type: 'reset' }) }
  function sendKick(playerId: string) { send({ type: 'kick', playerId }) }
  function sendBan(playerId: string) { send({ type: 'ban', playerId }) }
  function sendUnban(cid: string) { send({ type: 'unban', clientId: cid }) }
  function sendTransferHost(playerId: string) { send({ type: 'transfer-host', playerId }) }
  function sendUpdateSettings(settings: Partial<RoomSettings>) { send({ type: 'update-settings', settings }) }

  // Cleanup
  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    stopPing()
    ws.value?.close()
  })

  // Initialize
  if (typeof window !== 'undefined') {
    initClientId()
  }

  return {
    roomState,
    myPlayer,
    connectionStatus,
    notifications,
    voteResults,
    bannedUntil,
    clientId,
    playerName,
    join,
    reconnect,
    sendVote,
    sendReveal,
    sendReset,
    sendKick,
    sendBan,
    sendUnban,
    sendTransferHost,
    sendUpdateSettings,
  }
}
