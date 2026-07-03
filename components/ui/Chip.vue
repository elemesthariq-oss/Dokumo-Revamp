<script setup lang="ts">
defineProps<{ active?: boolean }>()
</script>

<template>
  <button
    class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition"
    :class="active ? 'border-brandTint2 bg-brandTint text-brandStrong' : 'border-transparent bg-surface2 text-ink2 hover:border-borderStrong'"
  >
    <slot />
  </button>
</template>
