<template>
  <div class="voting-results">
    <h3 class="text-center text-lg font-semibold text-white mb-4">📊 Results</h3>
    <div class="flex flex-wrap gap-4 justify-center">
      <div
        v-for="result in results"
        :key="result.card"
        class="result-card"
        :class="{
          'medal-gold': result.medal === 'gold',
          'medal-silver': result.medal === 'silver',
          'medal-bronze': result.medal === 'bronze',
          'medal-none': !result.medal,
        }"
      >
        <!-- Medal badge -->
        <div v-if="result.medal" class="medal-badge">
          {{ medalEmoji(result.medal) }}
        </div>

        <!-- Card face -->
        <div class="result-card-face">
          <span class="result-value">{{ result.card }}</span>
        </div>

        <!-- Count -->
        <div class="text-center mt-2">
          <span class="text-sm font-semibold text-white">{{ result.count }}x</span>
        </div>

        <!-- Voter names -->
        <div class="voter-names">
          <span
            v-for="name in result.players"
            :key="name"
            class="voter-name"
          >{{ name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VoteResult } from '@scrum-poker/shared'

defineProps<{
  results: VoteResult[]
}>()

function medalEmoji(medal: 'gold' | 'silver' | 'bronze'): string {
  return { gold: '🥇', silver: '🥈', bronze: '🥉' }[medal]
}
</script>

<style scoped>
.voting-results {
  @apply bg-gray-800/40 rounded-2xl p-5 border border-gray-700;
}

.result-card {
  @apply relative flex flex-col items-center;
}

.medal-badge {
  @apply text-2xl mb-1;
}

.result-card-face {
  @apply w-16 h-24 rounded-xl flex items-center justify-center
    font-bold shadow-lg border-2 transition-transform duration-200;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-color: #60a5fa;
}

.medal-gold .result-card-face {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #fbbf24;
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
}

.medal-silver .result-card-face {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  border-color: #d1d5db;
  transform: scale(1.08);
  box-shadow: 0 0 15px rgba(156, 163, 175, 0.4);
}

.medal-bronze .result-card-face {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: #f59e0b;
  transform: scale(1.04);
}

.result-value {
  @apply text-white text-xl font-bold;
}

.voter-names {
  @apply flex flex-col items-center gap-0.5 mt-1.5 max-w-24;
}

.voter-name {
  @apply text-xs text-gray-400 truncate;
}
</style>
