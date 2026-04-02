import type { Player, VoteResult } from './types'

export function computeVoteResults(players: Player[], cards: string[]): VoteResult[] {
  // Count votes per card
  const voteCounts = new Map<string, string[]>()

  for (const player of players) {
    if (player.isHost || !player.hasVoted || player.vote === null) continue
    const existing = voteCounts.get(player.vote) || []
    existing.push(player.name)
    voteCounts.set(player.vote, existing)
  }

  if (voteCounts.size === 0) return []

  // Build results sorted by count desc, then by card order in deck
  const results: Omit<VoteResult, 'medal'>[] = Array.from(voteCounts.entries()).map(([card, players]) => ({
    card,
    count: players.length,
    players,
  }))

  results.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    // Secondary sort by card order in deck
    const aIdx = cards.indexOf(a.card)
    const bIdx = cards.indexOf(b.card)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.card.localeCompare(b.card)
  })

  // Assign medals based on distinct counts (same count = same medal)
  const distinctCounts = [...new Set(results.map(r => r.count))].slice(0, 3)
  const medals: ('gold' | 'silver' | 'bronze')[] = ['gold', 'silver', 'bronze']

  return results.map(r => ({
    ...r,
    medal: (medals[distinctCounts.indexOf(r.count)] ?? null) as VoteResult['medal'],
  }))
}
