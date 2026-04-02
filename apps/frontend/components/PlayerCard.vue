<template>
  <div
    class="player-card-wrapper flex flex-col items-center gap-2"
    :class="{ 'player-me': isMe }"
  >
    <div
      class="player-card-face"
      :class="{
        'card-voted': player.hasVoted && !revealed,
        'card-revealed': revealed,
        'card-disconnected': !player.isConnected,
      }"
    >
      <!-- Face down (not yet revealed) -->
      <div v-if="!revealed" class="card-back">
        <div v-if="player.hasVoted" class="voted-indicator">✓</div>
        <div v-else class="card-pattern">
          <span class="text-3xl opacity-30">🃏</span>
        </div>
      </div>

      <!-- Face up (revealed) -->
      <div v-else class="card-front">
        <span v-if="player.vote" class="vote-value">{{ player.vote }}</span>
        <span v-else class="vote-value opacity-50">—</span>
      </div>
    </div>

    <!-- Player name -->
    <div class="text-center">
      <span class="text-xs text-gray-300 truncate max-w-20 block">
        {{ player.name }}
        <span v-if="isMe" class="text-blue-400">(you)</span>
      </span>
      <span v-if="player.isHost" class="text-xs text-yellow-400">👑 host</span>
      <span v-if="!player.isConnected" class="text-xs text-red-400">offline</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '@scrum-poker/shared'

defineProps<{
  player: Player
  revealed: boolean
  isMe: boolean
}>()
</script>

<style scoped>
.player-card-wrapper {
  @apply transition-transform duration-200;
}

.player-card-face {
  @apply w-16 h-24 rounded-xl flex items-center justify-center
    border-2 transition-all duration-300 shadow-md;
  width: 64px;
  height: 96px;
  border-color: #4b5563;
  background: linear-gradient(135deg, #374151, #1f2937);
}

.card-back {
  @apply w-full h-full rounded-xl flex items-center justify-center;
}

.card-front {
  @apply w-full h-full rounded-xl flex items-center justify-center
    bg-gradient-to-br from-blue-500 to-blue-700;
}

.vote-value {
  @apply text-white font-bold;
  font-size: clamp(14px, 3vw, 20px);
}

.card-voted {
  border-color: #22c55e !important;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
}

.card-revealed {
  background: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  padding: 0;
}

.card-disconnected {
  opacity: 0.5;
}

.player-me .player-card-face {
  border-color: #3b82f6;
}

.player-me.player-card-wrapper {
  transform: scale(1.05);
}

.voted-indicator {
  @apply text-green-400 text-2xl font-bold;
}
</style>
