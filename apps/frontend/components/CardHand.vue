<template>
  <div class="card-hand-container relative select-none">
    <p class="text-center text-gray-400 text-sm mb-4">
      {{ disabled ? '⏳ Waiting for results...' : 'Pick your card' }}
    </p>
    <div class="cards-fan" :style="{ height: fanHeight + 'px' }">
      <div
        v-for="(card, index) in cards"
        :key="card"
        class="playing-card"
        :class="{
          'card-selected': selectedCard === card,
          'card-disabled': disabled,
        }"
        :style="getCardStyle(index)"
        @click="!disabled && selectCard(card)"
      >
        <div class="card-inner">
          <span class="card-value">{{ card }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  cards: string[]
  selectedCard: string | null
  disabled: boolean
}>()

const emit = defineEmits<{
  select: [card: string]
}>()

const fanHeight = 160

function getCardStyle(index: number): Record<string, string> {
  const total = props.cards.length
  const spread = Math.min(60, total * 5)
  const angle = total <= 1 ? 0 : ((index / (total - 1)) - 0.5) * spread * 2
  const card = props.cards[index]
  const isSelected = props.selectedCard === card

  const translateX = angle * 3
  const baseY = isSelected ? -40 : 0

  return {
    transform: `translateX(${translateX}px) rotate(${angle}deg) translateY(${baseY}px)`,
    // Pivot point far below the card creates a natural fan/arc spread
    transformOrigin: 'center 300px',
    left: `calc(50% - 36px + ${translateX}px)`,
    zIndex: isSelected ? '50' : String(index),
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, z-index 0s',
  }
}

function selectCard(card: string) {
  emit('select', card)
}
</script>

<style scoped>
.card-hand-container {
  @apply w-full overflow-visible pb-4;
}

.cards-fan {
  @apply relative flex items-end justify-center;
}

.playing-card {
  @apply absolute bottom-0 cursor-pointer;
  width: 72px;
  height: 100px;
}

.playing-card:not(.card-disabled):hover {
  transform: translateY(-20px) rotate(var(--rotate, 0deg)) !important;
  z-index: 100 !important;
}

.card-inner {
  @apply w-full h-full rounded-xl flex items-center justify-center font-bold text-xl
    bg-gradient-to-br from-blue-500 to-blue-700
    border-2 border-blue-400
    shadow-lg
    transition-all duration-200;
  color: white;
}

.card-selected .card-inner {
  @apply from-yellow-400 to-yellow-600 border-yellow-300 shadow-yellow-400/50;
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.6);
  color: #1a1a1a;
}

.card-disabled .card-inner {
  @apply from-gray-600 to-gray-700 border-gray-500 cursor-not-allowed opacity-60;
}

.card-value {
  @apply text-center leading-none;
  font-size: clamp(14px, 3vw, 22px);
}
</style>
