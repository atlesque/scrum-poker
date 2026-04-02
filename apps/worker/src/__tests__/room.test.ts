import { describe, it, expect } from 'vitest'
import { computeVoteResults } from '@scrum-poker/shared'
import type { Player, BanEntry } from '@scrum-poker/shared'

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    clientId: overrides.id,
    name: overrides.id,
    isHost: false,
    hasVoted: false,
    vote: null,
    isConnected: true,
    ...overrides,
  }
}

const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']

describe('worker - computeVoteResults integration', () => {
  it('correctly aggregates votes from players', () => {
    const players = [
      makePlayer({ id: 'host', isHost: true }),
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '5' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '5' }),
      makePlayer({ id: 'p3', name: 'Carol', hasVoted: true, vote: '3' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results).toHaveLength(2)
    expect(results[0].card).toBe('5')
    expect(results[0].count).toBe(2)
    expect(results[0].medal).toBe('gold')
    expect(results[1].card).toBe('3')
    expect(results[1].count).toBe(1)
    expect(results[1].medal).toBe('silver')
  })
})

describe('worker - ban logic', () => {
  it('identifies active bans correctly', () => {
    const now = Date.now()
    const bans: BanEntry[] = [
      { clientId: 'c1', playerName: 'Alice', bannedAt: now - 1000, banDuration: 30 * 60 * 1000 },
      { clientId: 'c2', playerName: 'Bob', bannedAt: now - 31 * 60 * 1000, banDuration: 30 * 60 * 1000 },
    ]

    const activeBans = bans.filter(b => b.bannedAt + b.banDuration > now)
    expect(activeBans).toHaveLength(1)
    expect(activeBans[0].clientId).toBe('c1')
  })

  it('expired bans are not active', () => {
    const now = Date.now()
    const bans: BanEntry[] = [
      { clientId: 'c1', playerName: 'Alice', bannedAt: now - 60 * 60 * 1000, banDuration: 30 * 60 * 1000 },
    ]
    const activeBans = bans.filter(b => b.bannedAt + b.banDuration > now)
    expect(activeBans).toHaveLength(0)
  })

  it('unban removes the ban entry', () => {
    let bans: BanEntry[] = [
      { clientId: 'c1', playerName: 'Alice', bannedAt: Date.now(), banDuration: 30 * 60 * 1000 },
      { clientId: 'c2', playerName: 'Bob', bannedAt: Date.now(), banDuration: 30 * 60 * 1000 },
    ]
    bans = bans.filter(b => b.clientId !== 'c1')
    expect(bans).toHaveLength(1)
    expect(bans[0].clientId).toBe('c2')
  })
})
