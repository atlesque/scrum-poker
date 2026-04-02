<template>
  <div class="room-settings p-4 space-y-6">
    <!-- Deck Selection -->
    <div class="setting-group">
      <label class="setting-label">Card Deck</label>
      <select
        :value="settings.deckId"
        @change="update('deckId', ($event.target as HTMLSelectElement).value)"
        :disabled="!isHost"
        class="setting-select"
      >
        <option v-for="deck in allDecks" :key="deck.id" :value="deck.id">
          {{ deck.name }}
        </option>
      </select>
    </div>

    <!-- Toggles -->
    <div class="setting-group">
      <label class="setting-label">Auto-Reveal</label>
      <p class="setting-hint">Automatically reveal when all players have voted</p>
      <button
        @click="isHost && update('autoReveal', !settings.autoReveal)"
        :disabled="!isHost"
        class="toggle-btn"
        :class="settings.autoReveal ? 'toggle-on' : 'toggle-off'"
      >
        {{ settings.autoReveal ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="setting-group">
      <label class="setting-label">Always Reveal</label>
      <p class="setting-hint">Show votes even while voting is in progress</p>
      <button
        @click="isHost && update('alwaysReveal', !settings.alwaysReveal)"
        :disabled="!isHost"
        class="toggle-btn"
        :class="settings.alwaysReveal ? 'toggle-on' : 'toggle-off'"
      >
        {{ settings.alwaysReveal ? 'ON' : 'OFF' }}
      </button>
    </div>

    <!-- Ban Duration -->
    <div class="setting-group">
      <label class="setting-label">Ban Duration (minutes)</label>
      <input
        type="number"
        :value="Math.round(settings.banDuration / 60000)"
        @change="isHost && update('banDuration', +($event.target as HTMLInputElement).value * 60000)"
        :disabled="!isHost"
        min="1"
        max="10080"
        class="setting-input"
      />
    </div>

    <!-- Custom Decks -->
    <div class="setting-group">
      <label class="setting-label">Custom Decks</label>
      <div v-if="isHost" class="space-y-2">
        <div
          v-for="(deck, idx) in settings.customDecks"
          :key="deck.id"
          class="bg-gray-700/40 rounded-lg p-3 space-y-2"
        >
          <div class="flex items-center gap-2">
            <input
              :value="deck.name"
              @input="updateCustomDeckName(idx, ($event.target as HTMLInputElement).value)"
              class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white"
              placeholder="Deck name"
            />
            <button @click="removeCustomDeck(idx)" class="text-red-400 hover:text-red-300 text-sm">✕</button>
          </div>
          <input
            :value="deck.cards.join(', ')"
            @blur="updateCustomDeckCards(idx, ($event.target as HTMLInputElement).value)"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white"
            placeholder="Cards: 1, 2, 3, 5, 8 ..."
          />
        </div>
        <button
          @click="addCustomDeck"
          class="w-full py-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 rounded-lg transition-colors"
        >
          + Add Custom Deck
        </button>
      </div>
    </div>

    <!-- Banned Players -->
    <div v-if="bannedClientIds.length > 0 && isHost" class="setting-group">
      <label class="setting-label">Banned Players ({{ bannedClientIds.length }})</label>
      <div class="space-y-2">
        <div
          v-for="ban in activeBans"
          :key="ban.clientId"
          class="flex items-center justify-between bg-gray-700/40 rounded-lg px-3 py-2"
        >
          <div>
            <p class="text-sm text-white">{{ ban.playerName }}</p>
            <p class="text-xs text-gray-400">Until {{ new Date(ban.bannedAt + ban.banDuration).toLocaleString() }}</p>
          </div>
          <button
            @click="$emit('unban', ban.clientId)"
            class="text-xs px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-green-100 transition-colors"
          >
            Unban
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomSettings, BanEntry, CardDeck } from '@scrum-poker/shared'
import { DEFAULT_DECKS } from '@scrum-poker/shared'

const props = defineProps<{
  settings: RoomSettings
  bans: BanEntry[]
  bannedClientIds: string[]
  isHost: boolean
}>()

const emit = defineEmits<{
  update: [settings: Partial<RoomSettings>]
  unban: [clientId: string]
}>()

const allDecks = computed(() => [...DEFAULT_DECKS, ...props.settings.customDecks])

const activeBans = computed(() =>
  props.bans.filter(b => props.bannedClientIds.includes(b.clientId))
)

function update<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
  emit('update', { [key]: value } as Partial<RoomSettings>)
}

function addCustomDeck() {
  const newDeck: CardDeck = {
    id: `custom-${Date.now()}`,
    name: 'Custom Deck',
    type: 'custom',
    cards: ['1', '2', '3', '5', '8'],
  }
  emit('update', { customDecks: [...props.settings.customDecks, newDeck] })
}

function removeCustomDeck(index: number) {
  const decks = props.settings.customDecks.filter((_, i) => i !== index)
  emit('update', { customDecks: decks })
}

function updateCustomDeckName(index: number, name: string) {
  const decks = props.settings.customDecks.map((d, i) =>
    i === index ? { ...d, name } : d
  )
  emit('update', { customDecks: decks })
}

function updateCustomDeckCards(index: number, value: string) {
  const cards = value.split(',').map(c => c.trim()).filter(Boolean)
  const decks = props.settings.customDecks.map((d, i) =>
    i === index ? { ...d, cards } : d
  )
  emit('update', { customDecks: decks })
}
</script>

<style scoped>
.setting-group {
  @apply space-y-1.5;
}

.setting-label {
  @apply block text-sm font-semibold text-gray-300;
}

.setting-hint {
  @apply text-xs text-gray-500;
}

.setting-select {
  @apply w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed;
}

.setting-input {
  @apply w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed;
}

.toggle-btn {
  @apply px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200;
}

.toggle-on {
  @apply bg-green-600 text-white;
}

.toggle-off {
  @apply bg-gray-600 text-gray-300;
}
</style>
