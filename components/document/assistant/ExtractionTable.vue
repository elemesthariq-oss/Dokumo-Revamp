<script setup lang="ts">
import { ArrowUpDown, ChevronDown, ChevronRight, Download, ExternalLink, FileText } from 'lucide-vue-next'
import { parseCurrency, type AssistantResultRow } from '~/composables/useDocumentAssistant'

const props = defineProps<{
  title: string
  rows: AssistantResultRow[]
  compact?: boolean
}>()

const emit = defineEmits<{ (event: 'open-source', id: string): void }>()

type SortKey = 'company' | 'documentNumber' | 'date' | 'taxBase' | 'vat' | 'total'
const sortKey = ref<SortKey | ''>('')
const sortAsc = ref(true)
const filterText = ref('')
const expandedId = ref('')

const currencyKeys: SortKey[] = ['taxBase', 'vat', 'total']

const filteredRows = computed(() => {
  const query = filterText.value.trim().toLowerCase()
  let rows = props.rows.slice()
  if (query) {
    rows = rows.filter(row =>
      [row.company, row.documentNumber, row.documentType, row.title, row.status]
        .join(' ').toLowerCase().includes(query))
  }
  if (sortKey.value) {
    const key = sortKey.value
    const isCurrency = currencyKeys.includes(key)
    rows.sort((a, b) => {
      const left = isCurrency ? parseCurrency(a[key]) : a[key]
      const right = isCurrency ? parseCurrency(b[key]) : b[key]
      if (left === right) return 0
      return (left > right ? 1 : -1) * (sortAsc.value ? 1 : -1)
    })
  }
  return rows
})

const totals = computed(() => ({
  taxBase: filteredRows.value.reduce((sum, row) => sum + parseCurrency(row.taxBase), 0),
  vat: filteredRows.value.reduce((sum, row) => sum + parseCurrency(row.vat), 0),
  total: filteredRows.value.reduce((sum, row) => sum + parseCurrency(row.total), 0),
}))

function formatTotal(value: number) {
  return value ? `Rp${new Intl.NumberFormat('id-ID').format(value)}` : '-'
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  }
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function exportCsv() {
  const header = ['Perusahaan', 'Jenis', 'Nomor', 'Tanggal', 'DPP', 'PPN', 'Total', 'Status', 'Sumber', 'Dokumen']
  const lines = filteredRows.value.map(row => [
    row.company, row.documentType, row.documentNumber, row.date, row.taxBase, row.vat, row.total, row.status, row.source, row.title,
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ekstraksi-dokumen-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="overflow-hidden rounded-[12px] border border-border bg-surface">
    <!-- header -->
    <div class="flex flex-wrap items-center gap-2 border-b border-border bg-surface2 px-3 py-2.5">
      <FileText :size="15" class="text-brandStrong" />
      <span class="text-[12.5px] font-bold text-ink">{{ title }}</span>
      <span class="rounded-full bg-brandTint px-2 py-0.5 text-[10.5px] font-bold text-brandStrong">{{ rows.length }} dokumen</span>
      <div class="ml-auto flex items-center gap-1.5">
        <input
          v-model="filterText"
          type="search"
          placeholder="Filter…"
          class="h-8 w-28 rounded-[8px] border border-borderStrong bg-surface px-2.5 text-[11.5px] text-ink placeholder:text-ink3 focus:border-brand focus:ring-2 focus:ring-brandTint2 sm:w-36"
          aria-label="Filter tabel"
        >
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1 rounded-[8px] border border-borderStrong bg-surface px-2.5 text-[11.5px] font-semibold text-ink2 transition hover:border-brandTint2 hover:text-brandStrong"
          @click="exportCsv"
        >
          <Download :size="13" /> Export
        </button>
      </div>
    </div>

    <!-- table -->
    <div class="max-h-[320px] overflow-auto overscroll-contain">
      <table class="min-w-[820px] border-collapse text-left text-[11.5px]">
        <thead class="sticky top-0 z-10 bg-[#f8fafc] text-ink2 shadow-[0_1px_0_var(--border)]">
          <tr>
            <th class="assistant-th w-8" />
            <th class="assistant-th cursor-pointer select-none" @click="toggleSort('company')">
              <span class="inline-flex items-center gap-1">Nama PT / Vendor <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th">Jenis</th>
            <th class="assistant-th cursor-pointer select-none" @click="toggleSort('documentNumber')">
              <span class="inline-flex items-center gap-1">Nomor <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th cursor-pointer select-none" @click="toggleSort('date')">
              <span class="inline-flex items-center gap-1">Tanggal <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th cursor-pointer select-none text-right" @click="toggleSort('taxBase')">
              <span class="inline-flex items-center gap-1">DPP <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th cursor-pointer select-none text-right" @click="toggleSort('vat')">
              <span class="inline-flex items-center gap-1">PPN <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th cursor-pointer select-none text-right" @click="toggleSort('total')">
              <span class="inline-flex items-center gap-1">Total <ArrowUpDown :size="11" class="opacity-50" /></span>
            </th>
            <th class="assistant-th">Status</th>
            <th class="assistant-th">Sumber</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border text-ink2">
          <template v-for="row in filteredRows" :key="row.id">
            <tr class="hover:bg-surface2">
              <td class="assistant-td text-center">
                <button
                  type="button"
                  class="inline-flex h-6 w-6 items-center justify-center rounded text-ink3 hover:bg-brandTint hover:text-brandStrong"
                  :aria-label="expandedId === row.id ? 'Tutup detail' : 'Lihat detail'"
                  @click="toggleExpand(row.id)"
                >
                  <ChevronDown v-if="expandedId === row.id" :size="14" />
                  <ChevronRight v-else :size="14" />
                </button>
              </td>
              <td class="assistant-td max-w-[180px] font-semibold text-ink">
                <span class="block truncate" :title="row.company">{{ row.company }}</span>
              </td>
              <td class="assistant-td whitespace-nowrap">{{ row.documentType }}</td>
              <td class="assistant-td whitespace-nowrap font-mono text-[11px]">{{ row.documentNumber }}</td>
              <td class="assistant-td whitespace-nowrap">{{ row.date }}</td>
              <td class="assistant-td whitespace-nowrap text-right tabular-nums">{{ row.taxBase }}</td>
              <td class="assistant-td whitespace-nowrap text-right tabular-nums">{{ row.vat }}</td>
              <td class="assistant-td whitespace-nowrap text-right font-semibold tabular-nums text-ink">{{ row.total }}</td>
              <td class="assistant-td whitespace-nowrap">{{ row.status }}</td>
              <td class="assistant-td min-w-[150px]">
                <button
                  type="button"
                  class="inline-flex max-w-[150px] items-center gap-1 font-semibold text-brandStrong hover:underline"
                  @click="emit('open-source', row.id)"
                >
                  <span class="truncate" :title="row.title">Lihat Sumber</span><ExternalLink :size="12" class="shrink-0" />
                </button>
              </td>
            </tr>
            <tr v-if="expandedId === row.id" class="bg-surface2">
              <td />
              <td colspan="9" class="px-3 py-2.5">
                <dl class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-3">
                  <div><dt class="text-ink3">Dokumen</dt><dd class="font-semibold text-ink">{{ row.title }}</dd></div>
                  <div><dt class="text-ink3">Sumber scan</dt><dd class="font-semibold text-ink2">{{ row.source }}</dd></div>
                  <div><dt class="text-ink3">Jenis</dt><dd class="font-semibold text-ink2">{{ row.documentType }}</dd></div>
                  <div><dt class="text-ink3">DPP</dt><dd class="font-semibold tabular-nums text-ink2">{{ row.taxBase }}</dd></div>
                  <div><dt class="text-ink3">PPN</dt><dd class="font-semibold tabular-nums text-ink2">{{ row.vat }}</dd></div>
                  <div><dt class="text-ink3">Total</dt><dd class="font-semibold tabular-nums text-ink">{{ row.total }}</dd></div>
                </dl>
              </td>
            </tr>
          </template>
          <tr v-if="!filteredRows.length">
            <td colspan="10" class="px-3 py-6 text-center text-[11.5px] text-ink3">Tidak ada baris yang cocok dengan filter.</td>
          </tr>
        </tbody>
        <tfoot v-if="filteredRows.length" class="sticky bottom-0 bg-[#f8fafc] font-bold text-ink shadow-[0_-1px_0_var(--border)]">
          <tr>
            <td class="assistant-td" colspan="5">Total ({{ filteredRows.length }} dokumen)</td>
            <td class="assistant-td whitespace-nowrap text-right tabular-nums">{{ formatTotal(totals.taxBase) }}</td>
            <td class="assistant-td whitespace-nowrap text-right tabular-nums">{{ formatTotal(totals.vat) }}</td>
            <td class="assistant-td whitespace-nowrap text-right tabular-nums">{{ formatTotal(totals.total) }}</td>
            <td class="assistant-td" colspan="2" />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.assistant-th {
  padding: 8px 10px;
  font-weight: 700;
  white-space: nowrap;
}
.assistant-td {
  padding: 8px 10px;
  vertical-align: top;
}
</style>
