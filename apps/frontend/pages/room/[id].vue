<template>
  <div class="min-h-screen bg-gray-950 flex flex-col">
    <!-- Header -->
    <header class="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="text-gray-400 hover:text-white transition-colors">🃏</NuxtLink>
        <span class="text-gray-500">/</span>
        <span class="font-mono text-white text-lg tracking-widest">{{ roomId }}</span>
        <span
          class="text-xs px-2 py-0.5 rounded-full"
          :class="{
            'bg-green-900 text-green-300': connectionStatus === 'connected',
            'bg-yellow-900 text-yellow-300': connectionStatus === 'connecting',
            'bg-red-900 text-red-300': connectionStatus === 'disconnected' || connectionStatus === 'error',
          }"
        >
          {{ connectionStatus }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="myPlayer"
          @click="showSettings = !showSettings"
          class="text-sm px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          ⚙️ Settings
        </button>
        <button
          @click="copyRoomLink"
          class="text-sm px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          {{ copied ? '✓ Copied!' : '🔗 Share' }}
        </button>
      </div>
    </header>

    <!-- Join Dialog -->
    <JoinDialog
      v-if="!myPlayer && connectionStatus !== 'error'"
      :loading="connectionStatus === 'connecting'"
      @join="handleJoin"
    />

    <!-- Banned Message -->
    <div v-else-if="bannedUntil" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-red-900/30 border border-red-700 rounded-2xl p-8 text-center max-w-md">
        <div class="text-5xl mb-4">🚫</div>
        <h2 class="text-xl font-bold text-red-300 mb-2">You are banned</h2>
        <p class="text-gray-300">Ban expires: <strong>{{ new Date(bannedUntil).toLocaleString() }}</strong></p>
      </div>
    </div>

    <!-- Connection Error -->
    <div v-else-if="connectionStatus === 'error'" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-red-900/30 border border-red-700 rounded-2xl p-8 text-center max-w-md">
        <div class="text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-red-300 mb-2">Connection Error</h2>
        <p class="text-gray-400 mb-4">Could not connect to the room.</p>
        <button @click="reconnect" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold">
          Reconnect
        </button>
      </div>
    </div>

    <!-- Main Room UI -->
    <div v-else-if="myPlayer && roomState" class="flex-1 flex flex-col overflow-hidden">
      <div class="flex flex-1 overflow-hidden">
        <!-- Main Game Area -->
        <div class="flex-1 flex flex-col p-4 overflow-y-auto">
          <!-- Phase Banner -->
          <div class="text-center mb-4">
            <span
              class="inline-block px-4 py-1 rounded-full text-sm font-semibold"
              :class="{
                'bg-gray-700 text-gray-300': roomState.phase === 'waiting',
                'bg-blue-900 text-blue-300': roomState.phase === 'voting',
                'bg-green-900 text-green-300': roomState.phase === 'revealed',
              }"
            >
              {{ phaseLabel }}
            </span>
          </div>

          <!-- Players Grid -->
          <div class="flex flex-wrap gap-3 justify-center mb-4">
            <PlayerCard
              v-for="player in roomState.players"
              :key="player.id"
              :player="player"
              :revealed="roomState.revealed"
              :is-me="player.clientId === myPlayer.clientId"
            />
          </div>

          <!-- Vote Results -->
          <VotingResults
            v-if="roomState.revealed && voteResults"
            :results="voteResults"
            class="mb-4"
          />

          <!-- Host Controls -->
          <HostControls
            v-if="myPlayer.isHost"
            :room-state="roomState"
            :my-player="myPlayer"
            @reveal="sendReveal"
            @reset="sendReset"
            @kick="sendKick"
            @ban="sendBan"
            @transfer-host="sendTransferHost"
            class="mb-4"
          />

          <!-- Card Hand (for non-host players) -->
          <div v-if="!myPlayer.isHost" class="mt-auto pt-4">
            <CardHand
              :cards="currentDeck.cards"
              :selected-card="myPlayer.vote"
              :disabled="roomState.revealed || roomState.phase === 'revealed'"
              @select="sendVote"
            />
          </div>
        </div>

        <!-- Settings Sidebar -->
        <Transition name="slide-right">
          <div
            v-if="showSettings"
            class="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto"
          >
            <div class="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 class="font-semibold text-white">Settings</h2>
              <button @click="showSettings = false" class="text-gray-400 hover:text-white">✕</button>
            </div>
            <RoomSettings
              :settings="roomState.settings"
              :bans="roomState.bans"
              :banned-client-ids="roomState.bannedClientIds"
              :is-host="myPlayer.isHost"
              @update="sendUpdateSettings"
              @unban="sendUnban"
            />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Notifications -->
    <NotificationToast :notifications="notifications" />
  </div>
</template>

<script setup lang="ts">
import { useRoom } from '~/composables/useRoom'
import { DEFAULT_DECKS } from '@scrum-poker/shared'
import type { RoomSettings } from '@scrum-poker/shared'

const route = useRoute()
const roomId = route.params.id as string

const {
  roomState,
  myPlayer,
  connectionStatus,
  notifications,
  voteResults,
  bannedUntil,
  sendVote,
  sendReveal,
  sendReset,
  sendKick,
  sendBan,
  sendUnban,
  sendTransferHost,
  sendUpdateSettings,
  join,
  reconnect,
} = useRoom(roomId)

const showSettings = ref(false)
const copied = ref(false)

const phaseLabel = computed(() => {
  if (!roomState.value) return ''
  switch (roomState.value.phase) {
    case 'waiting': return '⏳ Waiting for votes...'
    case 'voting': return '🗳️ Voting in progress'
    case 'revealed': return '🎉 Results revealed!'
  }
})

const currentDeck = computed(() => {
  if (!roomState.value) return DEFAULT_DECKS[0]
  const allDecks = [...DEFAULT_DECKS, ...(roomState.value.settings.customDecks || [])]
  return allDecks.find(d => d.id === roomState.value!.settings.deckId) ?? DEFAULT_DECKS[0]
})

function handleJoin(name: string) {
  join(name)
}

function copyRoomLink() {
  navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
