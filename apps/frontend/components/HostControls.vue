<template>
  <div class="host-controls bg-gray-800/40 rounded-2xl p-4 border border-gray-700">
    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Host Controls</h3>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-4">
      <button
        @click="$emit('reveal')"
        :disabled="!canReveal"
        class="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200"
        :class="canReveal
          ? 'bg-green-600 hover:bg-green-500 text-white'
          : 'bg-gray-700 text-gray-500 cursor-not-allowed'"
      >
        🃏 Reveal Cards
      </button>
      <button
        @click="$emit('reset')"
        :disabled="!canReset"
        class="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200"
        :class="canReset
          ? 'bg-blue-600 hover:bg-blue-500 text-white'
          : 'bg-gray-700 text-gray-500 cursor-not-allowed'"
      >
        🔄 Reset Table
      </button>
    </div>

    <!-- Player List -->
    <div class="space-y-2">
      <p class="text-xs text-gray-500 mb-1">Players ({{ nonHostPlayers.length }})</p>
      <div
        v-for="player in nonHostPlayers"
        :key="player.id"
        class="flex items-center gap-2 bg-gray-700/40 rounded-lg px-3 py-2"
      >
        <div
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="player.isConnected ? 'bg-green-400' : 'bg-gray-500'"
        />
        <span class="flex-1 text-sm text-gray-200 truncate">{{ player.name }}</span>
        <span v-if="player.hasVoted" class="text-xs text-green-400">✓</span>
        <span v-else class="text-xs text-gray-500">...</span>

        <!-- Host actions -->
        <div class="flex gap-1">
          <button
            @click="$emit('transfer-host', player.id)"
            title="Make host"
            class="text-xs px-2 py-0.5 rounded bg-yellow-700 hover:bg-yellow-600 text-yellow-100 transition-colors"
          >
            👑
          </button>
          <button
            @click="$emit('kick', player.id)"
            title="Kick"
            class="text-xs px-2 py-0.5 rounded bg-orange-700 hover:bg-orange-600 text-orange-100 transition-colors"
          >
            👢
          </button>
          <button
            @click="$emit('ban', player.id)"
            title="Ban"
            class="text-xs px-2 py-0.5 rounded bg-red-700 hover:bg-red-600 text-red-100 transition-colors"
          >
            🚫
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomState, Player } from '@scrum-poker/shared'

const props = defineProps<{
  roomState: RoomState
  myPlayer: Player
}>()

defineEmits<{
  reveal: []
  reset: []
  kick: [playerId: string]
  ban: [playerId: string]
  'transfer-host': [playerId: string]
}>()

const nonHostPlayers = computed(() =>
  props.roomState.players.filter(p => !p.isHost)
)

const canReveal = computed(() => {
  if (props.roomState.revealed) return false
  return nonHostPlayers.value.some(p => p.hasVoted)
})

const canReset = computed(() => props.roomState.phase !== 'waiting')
</script>
