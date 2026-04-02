<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
    <div class="w-full max-w-md space-y-8">
      <!-- Logo / Title -->
      <div class="text-center">
        <div class="text-6xl mb-4">🃏</div>
        <h1 class="text-4xl font-bold text-white tracking-tight">Scrum Poker</h1>
        <p class="mt-2 text-gray-400">Real-time planning poker for agile teams</p>
      </div>

      <!-- Create Room -->
      <div class="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700 space-y-4">
        <h2 class="text-lg font-semibold text-white">Create a Room</h2>
        <button
          @click="createRoom"
          :disabled="creating"
          class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span v-if="creating" class="animate-spin">⟳</span>
          <span>{{ creating ? 'Creating...' : '✨ Create New Room' }}</span>
        </button>
      </div>

      <!-- Join Room -->
      <div class="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700 space-y-4">
        <h2 class="text-lg font-semibold text-white">Join a Room</h2>
        <div class="flex gap-3">
          <input
            v-model="joinRoomId"
            @keydown.enter="joinRoom"
            type="text"
            placeholder="Room ID (e.g. ABC123)"
            maxlength="6"
            class="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest font-mono"
          />
          <button
            @click="joinRoom"
            :disabled="!joinRoomId.trim()"
            class="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-200"
          >
            Join →
          </button>
        </div>
        <p v-if="joinError" class="text-red-400 text-sm">{{ joinError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const workerUrl = runtimeConfig.public.workerUrl as string

const creating = ref(false)
const joinRoomId = ref('')
const joinError = ref('')

async function createRoom() {
  creating.value = true
  joinError.value = ''
  try {
    const res = await fetch(`${workerUrl}/api/rooms`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to create room')
    const data = await res.json() as { roomId: string }
    router.push(`/room/${data.roomId}`)
  } catch {
    joinError.value = 'Failed to create room. Is the worker running?'
    creating.value = false
  }
}

function joinRoom() {
  const id = joinRoomId.value.trim().toUpperCase()
  if (!id) return
  joinError.value = ''
  router.push(`/room/${id}`)
}
</script>
