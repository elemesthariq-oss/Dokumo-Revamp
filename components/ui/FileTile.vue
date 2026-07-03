<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center rounded-[10px] bg-[#fef2f2] font-bold text-[#dc2626]"
    :class="size === 'sm' ? 'h-9 w-9 text-[9px]' : 'h-[38px] w-[38px] text-[9.5px]'"
  >
    PDF
  </div>
</template>
