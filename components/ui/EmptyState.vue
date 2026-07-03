<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="flex min-h-[220px] flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface2 p-8 text-center">
    <div class="brand-gradient mb-4 flex h-12 w-12 items-center justify-center rounded-ctl text-white">AI</div>
    <h3 class="text-[15px] font-bold text-ink">{{ title }}</h3>
    <p class="mt-1 max-w-md text-[13px] text-ink3">{{ description }}</p>
  </div>
</template>
