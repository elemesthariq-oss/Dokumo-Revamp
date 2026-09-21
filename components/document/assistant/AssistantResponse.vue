<script setup lang="ts">
import { ArrowRight, CalendarClock, FileStack, ListChecks, Maximize2, ScrollText, Sparkles, Target } from 'lucide-vue-next'
import StatusPill from '~/components/document/assistant/StatusPill.vue'
import ExtractionTable from '~/components/document/assistant/ExtractionTable.vue'
import type { AssistantResult } from '~/composables/useDocumentAssistant'

const props = defineProps<{
  result: AssistantResult
  compact?: boolean
}>()

const emit = defineEmits<{
  (event: 'open-source', payload: { id: string; page?: number; anchor?: string }): void
  (event: 'suggest', text: string): void
  (event: 'expand'): void
}>()

const cardTone: Record<string, string> = {
  default: 'border-border bg-surface',
  brand: 'border-brandTint2 bg-brandTint',
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
}

const cardValueTone: Record<string, string> = {
  default: 'text-ink',
  brand: 'text-brandStrong',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
}

const timelineTone: Record<string, string> = {
  default: 'bg-ink3',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

// In compact (default panel) mode, hide the wide table behind a "Lihat Detail" affordance.
const showFullTable = computed(() => !props.compact)
</script>

<template>
  <div class="space-y-3">
    <!-- 1. Understanding -->
    <div class="flex items-start gap-2 rounded-[10px] bg-surface2 px-3 py-2">
      <Target :size="14" class="mt-0.5 shrink-0 text-brand" />
      <div class="min-w-0">
        <p class="text-[10.5px] font-bold uppercase tracking-wide text-ink3">Yang Anda minta</p>
        <p class="mt-0.5 text-[12px] leading-[18px] text-ink2">{{ result.understanding }}</p>
      </div>
    </div>

    <!-- 2. Key summary -->
    <p class="text-[13px] font-semibold leading-[20px] text-ink">{{ result.keySummary }}</p>

    <!-- 3a. Summary cards -->
    <div v-if="result.summaryCards?.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div
        v-for="card in result.summaryCards"
        :key="card.label"
        class="rounded-[10px] border px-3 py-2"
        :class="cardTone[card.tone || 'default']"
      >
        <p class="text-[10.5px] font-medium text-ink3">{{ card.label }}</p>
        <p class="mt-0.5 text-[15px] font-bold tabular-nums" :class="cardValueTone[card.tone || 'default']">{{ card.value }}</p>
        <p v-if="card.hint" class="text-[10px] text-ink3">{{ card.hint }}</p>
      </div>
    </div>

    <!-- 3b. Key-value list -->
    <div v-if="result.keyValues" class="overflow-hidden rounded-[10px] border border-border">
      <p class="border-b border-border bg-surface2 px-3 py-2 text-[11.5px] font-bold text-ink">{{ result.keyValues.title }}</p>
      <dl class="divide-y divide-border">
        <div v-for="item in result.keyValues.items" :key="item.label" class="flex items-center justify-between gap-3 px-3 py-2">
          <dt class="text-[11.5px] text-ink3">{{ item.label }}</dt>
          <dd class="flex items-center gap-2 text-[12px] font-semibold text-ink">
            {{ item.value }}
            <StatusPill v-if="item.status" :status="item.status" />
          </dd>
        </div>
      </dl>
    </div>

    <!-- 3c. Comparison table -->
    <div v-if="result.comparison" class="overflow-hidden rounded-[10px] border border-border">
      <p class="flex items-center gap-1.5 border-b border-border bg-surface2 px-3 py-2 text-[11.5px] font-bold text-ink">
        <FileStack :size="13" class="text-brandStrong" /> {{ result.comparison.title }}
      </p>
      <div class="overflow-x-auto overscroll-contain">
        <table class="min-w-full border-collapse text-left text-[11.5px]">
          <thead class="bg-[#f8fafc] text-ink2">
            <tr>
              <th class="px-3 py-2 font-bold">Field</th>
              <th v-for="col in result.comparison.block.columns" :key="col" class="px-3 py-2 font-bold">{{ col }}</th>
              <th class="px-3 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="row in result.comparison.block.rows" :key="row.label" :class="row.status === 'tidak-sesuai' ? 'bg-red-50/50' : ''">
              <td class="px-3 py-2 font-semibold text-ink">{{ row.label }}</td>
              <td v-for="(value, index) in row.values" :key="index" class="px-3 py-2 tabular-nums text-ink2">{{ value }}</td>
              <td class="px-3 py-2"><StatusPill :status="row.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3d. Validation checklist -->
    <div v-if="result.validation" class="overflow-hidden rounded-[10px] border border-border">
      <p class="flex items-center gap-1.5 border-b border-border bg-surface2 px-3 py-2 text-[11.5px] font-bold text-ink">
        <ListChecks :size="13" class="text-brandStrong" /> {{ result.validation.title }}
      </p>
      <ul class="divide-y divide-border">
        <li v-for="item in result.validation.items" :key="item.label" class="flex items-start gap-2.5 px-3 py-2.5">
          <StatusPill :status="item.status" class="mt-0.5 shrink-0" />
          <div class="min-w-0">
            <p class="text-[12px] font-semibold text-ink">{{ item.label }}</p>
            <p class="text-[11.5px] leading-[17px] text-ink2">{{ item.detail }}</p>
          </div>
        </li>
      </ul>
    </div>

    <!-- 3e. Timeline -->
    <div v-if="result.timeline" class="overflow-hidden rounded-[10px] border border-border px-3 py-3">
      <p class="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
        <CalendarClock :size="13" class="text-brandStrong" /> {{ result.timeline.title }}
      </p>
      <ol class="relative ml-1.5 space-y-3 border-l border-border pl-4">
        <li v-for="(item, index) in result.timeline.items" :key="index" class="relative">
          <span class="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface" :class="timelineTone[item.tone || 'default']" />
          <p class="text-[11px] font-semibold text-ink3">{{ item.date }}</p>
          <p class="text-[12px] font-semibold" :class="item.tone === 'danger' ? 'text-red-700' : 'text-ink'">{{ item.title }}</p>
          <p class="text-[11.5px] leading-[17px] text-ink2">{{ item.detail }}</p>
        </li>
      </ol>
    </div>

    <!-- 3f. Calculation breakdown -->
    <div v-if="result.calculation" class="overflow-hidden rounded-[10px] border border-border">
      <p class="border-b border-border bg-surface2 px-3 py-2 text-[11.5px] font-bold text-ink">{{ result.calculation.title }}</p>
      <dl>
        <div
          v-for="line in result.calculation.lines"
          :key="line.label"
          class="flex items-center justify-between gap-3 px-3 py-2"
          :class="line.emphasis ? 'border-t border-border bg-brandTint/40' : ''"
        >
          <dt class="text-[11.5px]" :class="line.emphasis ? 'font-bold text-ink' : 'text-ink3'">{{ line.label }}</dt>
          <dd class="tabular-nums" :class="line.emphasis ? 'text-[14px] font-bold text-brandStrong' : 'text-[12px] font-semibold text-ink'">{{ line.value }}</dd>
        </div>
      </dl>
    </div>

    <!-- 3g. Extraction table (full in expanded, summary + Lihat Detail in compact) -->
    <template v-if="result.table?.rows.length">
      <ExtractionTable
        v-if="showFullTable"
        :title="result.table.title"
        :rows="result.table.rows"
        @open-source="(id) => emit('open-source', { id })"
      />
      <button
        v-else
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-left transition hover:border-brandTint2 hover:bg-brandTint"
        @click="emit('expand')"
      >
        <span class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brandTint text-brandStrong"><ScrollText :size="15" /></span>
          <span>
            <span class="block text-[12px] font-bold text-ink">{{ result.table.title }}</span>
            <span class="block text-[11px] text-ink3">{{ result.table.rows.length }} dokumen • buka mode luas untuk tabel lengkap</span>
          </span>
        </span>
        <span class="flex items-center gap-1 text-[11.5px] font-bold text-brandStrong"><Maximize2 :size="13" /> Lihat Detail</span>
      </button>
    </template>

    <!-- 4. Important findings -->
    <div v-if="result.findings?.length" class="rounded-[10px] border border-amber-200 bg-amber-50/70 px-3 py-2.5">
      <p class="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-amber-800">
        <Sparkles :size="13" /> Temuan penting
      </p>
      <ul class="space-y-1.5">
        <li v-for="(finding, index) in result.findings" :key="index" class="flex items-start gap-2 text-[11.5px] leading-[17px] text-ink2">
          <StatusPill :status="finding.status" class="mt-0.5 shrink-0" />
          <span class="min-w-0">{{ finding.text }}</span>
        </li>
      </ul>
    </div>

    <!-- 5. Sources -->
    <div v-if="result.sources.length">
      <p class="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink3">Sumber ({{ result.sources.length }})</p>
      <div class="space-y-1.5">
        <div
          v-for="source in result.sources"
          :key="source.id + (source.anchor || '')"
          class="flex items-center gap-2 rounded-[9px] border border-border bg-surface px-2.5 py-2"
        >
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-brandTint text-brandStrong"><ScrollText :size="14" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[11.5px] font-semibold text-ink" :title="source.title">{{ source.title }}</p>
            <p class="text-[10.5px] text-ink3">
              <template v-if="source.page">Hal. {{ source.page }}</template>
              <template v-if="source.section"> • {{ source.section }}</template>
            </p>
          </div>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 rounded-[7px] border border-borderStrong px-2 py-1 text-[11px] font-bold text-brandStrong transition hover:border-brandTint2 hover:bg-brandTint"
            @click="emit('open-source', { id: source.id, page: source.page, anchor: source.anchor })"
          >
            Lihat Dokumen <ArrowRight :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- 6. Suggested next actions -->
    <div v-if="result.suggestedNext.length" class="flex flex-wrap gap-1.5 pt-0.5">
      <button
        v-for="prompt in result.suggestedNext"
        :key="prompt"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-borderStrong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 transition hover:border-brandTint2 hover:bg-brandTint hover:text-brandStrong"
        @click="emit('suggest', prompt)"
      >
        <Sparkles :size="11" class="text-brand" /> {{ prompt }}
      </button>
    </div>
  </div>
</template>
