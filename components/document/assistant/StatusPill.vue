<script setup lang="ts">
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-vue-next'
import type { FindingStatus } from '~/composables/useDocumentAssistant'

const props = defineProps<{ status: FindingStatus; size?: number }>()

const config: Record<FindingStatus, { label: string; icon: any; class: string }> = {
  'sesuai': { label: 'Sesuai', icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'perlu-diperiksa': { label: 'Perlu diperiksa', icon: AlertTriangle, class: 'bg-amber-50 text-amber-700 border-amber-200' },
  'tidak-sesuai': { label: 'Tidak sesuai', icon: XCircle, class: 'bg-red-50 text-red-700 border-red-200' },
  'tidak-tersedia': { label: 'Data tidak tersedia', icon: HelpCircle, class: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const current = computed(() => config[props.status])
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold"
    :class="current.class"
  >
    <component :is="current.icon" :size="props.size ?? 12" class="shrink-0" />
    {{ current.label }}
  </span>
</template>
