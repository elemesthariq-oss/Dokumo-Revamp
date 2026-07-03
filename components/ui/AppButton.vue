<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'ghost' | 'icon'
  type?: 'button' | 'submit'
  disabled?: boolean
  active?: boolean
}>(), {
  variant: 'ghost',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      variant === 'primary' && 'brand-gradient h-10 rounded-btn px-4 text-[13.5px] text-white shadow-cta hover:-translate-y-px',
      variant === 'ghost' && 'h-10 rounded-btn border border-borderStrong bg-surface px-3.5 text-[13.5px] text-ink2 hover:bg-surface2',
      variant === 'icon' && 'h-10 w-10 rounded-[11px] border border-borderStrong bg-surface text-ink2 hover:bg-surface2',
      active && 'border-brandTint2 bg-brandTint text-brandStrong',
    ]"
  >
    <slot />
  </button>
</template>
