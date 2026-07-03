<script setup lang="ts">
const ui = useUiStore()
</script>

<template>
  <div class="fixed bottom-5 right-5 z-[90] flex w-[320px] max-w-[calc(100vw-40px)] flex-col gap-2">
    <div
      v-for="toast in ui.toasts"
      :key="toast.id"
      class="rounded-card border bg-surface px-4 py-3 text-sm shadow-sm"
      :class="{
        'border-emerald-100 text-success': toast.type === 'success',
        'border-brandTint2 text-brandStrong': toast.type === 'info',
        'border-red-100 text-danger': toast.type === 'error',
      }"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
