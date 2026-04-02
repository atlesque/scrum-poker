<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="notification in notifications"
          :key="notification"
          class="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white shadow-xl max-w-xs"
        >
          {{ notification }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  notifications: string[]
}>()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
