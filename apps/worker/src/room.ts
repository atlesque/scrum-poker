import { DurableObject } from 'cloudflare:workers'
import type { ClientMessage, ServerMessage, Player, RoomState, BanEntry, RoomSettings } from '@scrum-poker/shared'
import { DEFAULT_DECKS, computeVoteResults } from '@scrum-poker/shared'

type ConnectedPlayer = Player & { ws: WebSocket }

export class RoomDO extends DurableObject {
  private players = new Map<string, ConnectedPlayer>()
  private clientToPlayer = new Map<string, string>()
  private settings: RoomSettings = {
    deckId: 'fibonacci',
    alwaysReveal: false,
    autoReveal: false,
    banDuration: 30 * 60 * 1000,
    customDecks: [],
  }
  private revealed = false
  private phase: 'waiting' | 'voting' | 'revealed' = 'waiting'
  private bans: BanEntry[] = []

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      // Allow non-WS requests (e.g. init ping)
      return new Response('OK', { status: 200 })
    }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
      const msg: ClientMessage = JSON.parse(raw)
      await this.handleMessage(ws, msg)
    } catch {
      this.send(ws, { type: 'error', message: 'Invalid message' })
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
    this.handleDisconnect(ws)
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.handleDisconnect(ws)
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // ignore send errors
    }
  }

  private broadcast(msg: ServerMessage, excludeWs?: WebSocket): void {
    for (const player of this.players.values()) {
      if (player.ws !== excludeWs) {
        this.send(player.ws, msg)
      }
    }
  }

  private getPlayerByWs(ws: WebSocket): ConnectedPlayer | undefined {
    for (const p of this.players.values()) {
      if (p.ws === ws) return p
    }
  }

  private getState(): RoomState {
    return {
      roomId: this.ctx.id.toString(),
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        clientId: p.clientId,
        name: p.name,
        isHost: p.isHost,
        hasVoted: p.hasVoted,
        vote: this.revealed ? p.vote : (p.hasVoted ? '?' : null),
        isConnected: p.isConnected,
      })),
      settings: this.settings,
      revealed: this.revealed,
      phase: this.phase,
      bans: this.bans,
      bannedClientIds: this.getActiveBannedClientIds(),
    }
  }

  private getActiveBannedClientIds(): string[] {
    const now = Date.now()
    return this.bans
      .filter(b => b.bannedAt + b.banDuration > now)
      .map(b => b.clientId)
  }

  private isClientBanned(clientId: string): BanEntry | null {
    const now = Date.now()
    return this.bans.find(b => b.clientId === clientId && b.bannedAt + b.banDuration > now) ?? null
  }

  private hasHost(): boolean {
    return Array.from(this.players.values()).some(p => p.isHost && p.isConnected)
  }

  private async handleMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
    if (msg.type === 'join') {
      await this.handleJoin(ws, msg)
      return
    }
    if (msg.type === 'ping') {
      this.send(ws, { type: 'pong' })
      return
    }

    const player = this.getPlayerByWs(ws)
    if (!player) {
      this.send(ws, { type: 'error', message: 'Not joined' })
      return
    }

    switch (msg.type) {
      case 'vote': await this.handleVote(ws, player, msg.card); break
      case 'reveal': await this.handleReveal(ws, player); break
      case 'reset': await this.handleReset(ws, player); break
      case 'kick': await this.handleKick(ws, player, msg.playerId); break
      case 'ban': await this.handleBan(ws, player, msg.playerId); break
      case 'unban': await this.handleUnban(ws, player, msg.clientId); break
      case 'transfer-host': await this.handleTransferHost(ws, player, msg.playerId); break
      case 'update-settings': await this.handleUpdateSettings(ws, player, msg.settings); break
    }
  }

  private async handleJoin(ws: WebSocket, msg: Extract<ClientMessage, { type: 'join' }>): Promise<void> {
    const ban = this.isClientBanned(msg.clientId)
    if (ban) {
      this.send(ws, { type: 'banned', until: ban.bannedAt + ban.banDuration })
      ws.close(1008, 'Banned')
      return
    }

    const existingPlayerId = this.clientToPlayer.get(msg.clientId)
    if (existingPlayerId && this.players.has(existingPlayerId)) {
      const existing = this.players.get(existingPlayerId)!
      existing.ws = ws
      existing.isConnected = true
      existing.name = msg.name
      this.send(ws, { type: 'room-state', state: this.getState() })
      this.broadcast({ type: 'notification', message: `${msg.name} reconnected` }, ws)
      return
    }

    const isFirstPlayer = this.players.size === 0 || !this.hasHost()
    const playerId = crypto.randomUUID()

    const player: ConnectedPlayer = {
      id: playerId,
      clientId: msg.clientId,
      name: msg.name,
      isHost: isFirstPlayer,
      hasVoted: false,
      vote: null,
      isConnected: true,
      ws,
    }

    this.players.set(playerId, player)
    this.clientToPlayer.set(msg.clientId, playerId)

    const playerInfo: Player = {
      id: player.id,
      clientId: player.clientId,
      name: player.name,
      isHost: player.isHost,
      hasVoted: player.hasVoted,
      vote: player.vote,
      isConnected: player.isConnected,
    }
    this.broadcast({ type: 'player-joined', player: playerInfo }, ws)
    this.send(ws, { type: 'room-state', state: this.getState() })
  }

  private handleDisconnect(ws: WebSocket): void {
    const player = this.getPlayerByWs(ws)
    if (!player) return

    player.isConnected = false

    if (player.isHost) {
      const nextPlayer = Array.from(this.players.values()).find(p => p.isConnected && p.id !== player.id)
      if (nextPlayer) {
        player.isHost = false
        nextPlayer.isHost = true
        this.broadcast({ type: 'notification', message: `${nextPlayer.name} is now the host` })
      }
    }

    this.broadcast({ type: 'player-left', playerId: player.id, name: player.name })

    const anyConnected = Array.from(this.players.values()).some(p => p.isConnected)
    if (!anyConnected) {
      this.players.clear()
      this.clientToPlayer.clear()
      this.revealed = false
      this.phase = 'waiting'
    }
  }

  private async handleVote(ws: WebSocket, player: ConnectedPlayer, card: string): Promise<void> {
    if (player.isHost) {
      this.send(ws, { type: 'error', message: 'Host cannot vote' })
      return
    }
    if (this.revealed) {
      this.send(ws, { type: 'error', message: 'Cards already revealed' })
      return
    }

    player.vote = card
    player.hasVoted = true
    this.phase = 'voting'

    this.broadcast({ type: 'player-voted', playerId: player.id })

    if (this.settings.autoReveal) {
      const nonHostPlayers = Array.from(this.players.values()).filter(p => !p.isHost && p.isConnected)
      const allVoted = nonHostPlayers.every(p => p.hasVoted)
      if (allVoted && nonHostPlayers.length > 0) {
        await this.doReveal()
      }
    }
  }

  private async handleReveal(ws: WebSocket, player: ConnectedPlayer): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can reveal' })
      return
    }
    await this.doReveal()
  }

  private async doReveal(): Promise<void> {
    this.revealed = true
    this.phase = 'revealed'

    const allDecks = [...DEFAULT_DECKS, ...this.settings.customDecks]
    const deck = allDecks.find(d => d.id === this.settings.deckId) ?? DEFAULT_DECKS[0]
    const results = computeVoteResults(Array.from(this.players.values()), deck.cards)

    const state = this.getState()
    this.broadcast({ type: 'vote-revealed', results, state })
  }

  private async handleReset(ws: WebSocket, player: ConnectedPlayer): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can reset' })
      return
    }

    for (const p of this.players.values()) {
      p.vote = null
      p.hasVoted = false
    }
    this.revealed = false
    this.phase = 'waiting'

    this.broadcast({ type: 'reset', state: this.getState() })
  }

  private async handleKick(ws: WebSocket, player: ConnectedPlayer, targetId: string): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can kick' })
      return
    }

    const target = this.players.get(targetId)
    if (!target) return

    this.send(target.ws, { type: 'kicked' })
    target.ws.close(1008, 'Kicked')
    this.players.delete(targetId)
    this.clientToPlayer.delete(target.clientId)

    this.broadcast({ type: 'player-left', playerId: targetId, name: target.name })
  }

  private async handleBan(ws: WebSocket, player: ConnectedPlayer, targetId: string): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can ban' })
      return
    }

    const target = this.players.get(targetId)
    if (!target) return

    const ban: BanEntry = {
      clientId: target.clientId,
      playerName: target.name,
      bannedAt: Date.now(),
      banDuration: this.settings.banDuration,
    }
    this.bans.push(ban)

    this.send(target.ws, { type: 'banned', until: ban.bannedAt + ban.banDuration })
    target.ws.close(1008, 'Banned')
    this.players.delete(targetId)
    this.clientToPlayer.delete(target.clientId)

    this.broadcast({ type: 'player-left', playerId: targetId, name: target.name })
    this.broadcast({ type: 'room-state', state: this.getState() })
  }

  private async handleUnban(ws: WebSocket, player: ConnectedPlayer, clientId: string): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can unban' })
      return
    }
    this.bans = this.bans.filter(b => b.clientId !== clientId)
    this.broadcast({ type: 'room-state', state: this.getState() })
  }

  private async handleTransferHost(ws: WebSocket, player: ConnectedPlayer, targetId: string): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can transfer host role' })
      return
    }

    const target = this.players.get(targetId)
    if (!target) return

    player.isHost = false
    target.isHost = true

    this.broadcast({ type: 'room-state', state: this.getState() })
    this.broadcast({ type: 'notification', message: `${target.name} is now the host` })
  }

  private async handleUpdateSettings(ws: WebSocket, player: ConnectedPlayer, newSettings: Partial<RoomSettings>): Promise<void> {
    if (!player.isHost) {
      this.send(ws, { type: 'error', message: 'Only host can change settings' })
      return
    }
    this.settings = { ...this.settings, ...newSettings }
    this.broadcast({ type: 'room-state', state: this.getState() })
  }
}
