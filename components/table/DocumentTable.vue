<script setup lang="ts">
import { MoreVertical } from 'lucide-vue-next'
import type { Document } from '~/types'

defineProps<{ documents: Document[] }>()
const docs = useDocumentsStore()

const headers = [
  { label: 'Nama Dokumen', key: '', class: 'w-[36%] min-w-[330px] pl-5 pr-4' },
  { label: 'Halaman', key: 'pages', class: 'w-[10%] min-w-[118px] px-4' },
  { label: 'Source', key: '', class: 'w-[18%] min-w-[220px] px-4' },
  { label: 'Kategori', key: 'category', class: 'w-[16%] min-w-[170px] px-4' },
  { label: 'Tanggal Scan', key: 'scannedAt', class: 'w-[16%] min-w-[190px] px-4' },
]
</script>

<template>
  <div class="overflow-x-auto">
    <table v-if="documents.length" class="w-full min-w-[1040px] table-fixed border-collapse">
      <thead>
        <tr class="h-[54px] border-b border-border text-left text-[11px] font-extrabold tracking-[0.08em] text-ink3">
          <th v-for="header in headers" :key="header.label" :class="header.class">
            <button v-if="header.key" class="inline-flex items-center gap-1.5 rounded-lg py-1 text-left uppercase transition hover:text-brandStrong" @click="docs.setSort(header.key as 'pages' | 'category' | 'scannedAt')">
              {{ header.label }}
              <span v-if="docs.sort.key === header.key" class="text-[13px] leading-none text-brandStrong">{{ docs.sort.direction === 'asc' ? '↑' : '↓' }}</span>
            </button>
            <span v-else class="uppercase">{{ header.label }}</span>
          </th>
          <th class="w-12 pr-5" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="document in documents"
          :key="document.id"
          class="h-[72px] border-b border-border transition last:border-b-0 hover:bg-surface2"
          :class="docs.lastHighlightedId === document.id ? 'bg-brandTint/60' : ''"
        >
          <td class="pl-5 pr-4">
            <div class="flex min-w-0 items-center gap-3.5">
              <FileTile />
              <div class="min-w-0">
                <NuxtLink :to="`/dokumen/ftp/${document.id}`" class="block truncate text-[14.5px] font-bold leading-5 text-ink hover:text-brandStrong">{{ document.title }}</NuxtLink>
                <span class="mt-0.5 block text-[12.5px] font-medium text-ink3">Scan dokumen</span>
              </div>
            </div>
          </td>
          <td class="px-4 text-[14px] font-semibold text-ink2">{{ document.pages }} Halaman</td>
          <td class="px-4 text-[14px] font-medium text-ink2"><span class="block truncate">{{ document.source }}</span></td>
          <td class="px-4"><Badge :category="document.category" /></td>
          <td class="px-4 text-[14px] font-medium text-ink2">{{ formatScanDate(document.scannedAt) }}</td>
          <td class="pr-5 text-right align-middle"><RowActionsMenu :document="document"><MoreVertical :size="17" /></RowActionsMenu></td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-else title="Tidak ada dokumen" description="Filter saat ini tidak menemukan dokumen yang sesuai." />
  </div>
</template>
