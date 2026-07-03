<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <section class="space-y-5">
    <slot name="prefix" />
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <div class="text-[12.5px] font-semibold text-ink3">Dokumo</div>
        <h1 class="mt-1 text-2xl font-bold tracking-[-0.02em]">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-[14px] text-ink2">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap gap-2 lg:justify-end">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
