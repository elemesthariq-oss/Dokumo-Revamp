<script setup lang="ts">
import type { Category } from '~/types'

const props = defineProps<{ category: Category }>()
const style = computed(() => categoryStyles[props.category])
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
    :style="{ backgroundColor: style.bg, color: style.fg }"
  >
    <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: style.fg }" />
    {{ category }}
  </span>
</template>
