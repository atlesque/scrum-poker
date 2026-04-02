<template>
  <div class="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
    <div class="w-full max-w-sm">
      <div class="bg-gray-800/60 backdrop-blur rounded-2xl p-8 border border-gray-700 shadow-2xl">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">🃏</div>
          <h2 class="text-2xl font-bold text-white">Join the Room</h2>
          <p class="text-gray-400 text-sm mt-1">Enter your name to start playing</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1.5">Your Name</label>
            <input
              v-model="name"
              @keydown.enter="submit"
              ref="inputRef"
              type="text"
              placeholder="e.g. Alice"
              maxlength="30"
              autofocus
              class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            @click="submit"
            :disabled="!name.trim() || loading"
            class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="inline-block animate-spin">⟳</span>
            <span>{{ loading ? 'Connecting...' : 'Join Room →' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  join: [name: string]
}>()

const name = ref('')
const inputRef = ref<HTMLInputElement>()

onMounted(() => {
  const saved = localStorage.getItem('scrum-poker-player-name')
  if (saved) name.value = saved
  nextTick(() => inputRef.value?.focus())
})

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed || props.loading) return
  emit('join', trimmed)
}
</script>
