import { describe, it, expect } from 'vitest'
import { computeVoteResults } from '../game'
import type { Player } from '../types'

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

describe('computeVoteResults', () => {
  it('returns empty array when no votes', () => {
    const players = [
      makePlayer({ id: 'p1', isHost: true }),
      makePlayer({ id: 'p2' }),
    ]
    expect(computeVoteResults(players, FIBONACCI_CARDS)).toEqual([])
  })

  it('counts votes correctly', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '5' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '5' }),
      makePlayer({ id: 'p3', name: 'Carol', hasVoted: true, vote: '8' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results).toHaveLength(2)
    expect(results[0].card).toBe('5')
    expect(results[0].count).toBe(2)
    expect(results[1].card).toBe('8')
    expect(results[1].count).toBe(1)
  })

  it('assigns gold medal to highest count', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '3' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '3' }),
      makePlayer({ id: 'p3', name: 'Carol', hasVoted: true, vote: '5' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results[0].medal).toBe('gold')
    expect(results[1].medal).toBe('silver')
  })

  it('assigns medals based on distinct counts', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '1' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '1' }),
      makePlayer({ id: 'p3', name: 'Carol', hasVoted: true, vote: '2' }),
      makePlayer({ id: 'p4', name: 'Dave', hasVoted: true, vote: '3' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results[0].medal).toBe('gold')   // count 2
    expect(results[1].medal).toBe('silver') // count 1
    expect(results[2].medal).toBe('silver') // count 1 (same count as silver)
  })

  it('handles tied votes - same count gets same medal', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '5' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '8' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results).toHaveLength(2)
    // Both have count 1, same medal
    expect(results[0].medal).toBe('gold')
    expect(results[1].medal).toBe('gold')
  })

  it('skips host votes', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Host', isHost: true, hasVoted: true, vote: '21' }),
      makePlayer({ id: 'p2', name: 'Alice', hasVoted: true, vote: '5' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results).toHaveLength(1)
    expect(results[0].card).toBe('5')
  })

  it('only includes cards that were voted for', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '13' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results).toHaveLength(1)
    expect(results[0].card).toBe('13')
  })

  it('includes voter names in results', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Alice', hasVoted: true, vote: '8' }),
      makePlayer({ id: 'p2', name: 'Bob', hasVoted: true, vote: '8' }),
    ]
    const results = computeVoteResults(players, FIBONACCI_CARDS)
    expect(results[0].players).toContain('Alice')
    expect(results[0].players).toContain('Bob')
  })
})
