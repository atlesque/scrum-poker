export type CardDeckType = 'fibonacci' | 'tshirt' | 'emoji' | 'custom'

export interface CardDeck {
  id: string
  name: string
  type: CardDeckType
  cards: string[]
}

export interface Player {
  id: string
  clientId: string
  name: string
  isHost: boolean
  hasVoted: boolean
  vote: string | null
  isConnected: boolean
}

export interface BanEntry {
  clientId: string
  playerName: string
  bannedAt: number
  banDuration: number
}

export interface RoomSettings {
  deckId: string
  alwaysReveal: boolean
  autoReveal: boolean
  banDuration: number
  customDecks: CardDeck[]
}

export interface RoomState {
  roomId: string
  players: Player[]
  settings: RoomSettings
  revealed: boolean
  phase: 'waiting' | 'voting' | 'revealed'
  bans: BanEntry[]
  bannedClientIds: string[]
}

export interface VoteResult {
  card: string
  count: number
  medal: 'gold' | 'silver' | 'bronze' | null
  players: string[]
}

export type ClientMessage =
  | { type: 'join'; name: string; clientId: string }
  | { type: 'vote'; card: string }
  | { type: 'reveal' }
  | { type: 'reset' }
  | { type: 'kick'; playerId: string }
  | { type: 'ban'; playerId: string }
  | { type: 'unban'; clientId: string }
  | { type: 'transfer-host'; playerId: string }
  | { type: 'update-settings'; settings: Partial<RoomSettings> }
  | { type: 'ping' }

export type ServerMessage =
  | { type: 'room-state'; state: RoomState }
  | { type: 'player-joined'; player: Player }
  | { type: 'player-left'; playerId: string; name: string }
  | { type: 'player-voted'; playerId: string }
  | { type: 'vote-revealed'; results: VoteResult[]; state: RoomState }
  | { type: 'reset'; state: RoomState }
  | { type: 'kicked' }
  | { type: 'banned'; until: number }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: 'notification'; message: string }
