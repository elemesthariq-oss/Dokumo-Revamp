<script setup lang="ts">
import { MoreVertical } from 'lucide-vue-next'
import type { Document } from '~/types'

defineProps<{ documents: Document[] }>()
</script>

<template>
  <div v-if="documents.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    <div v-for="document in documents" :key="document.id" class="rounded-card border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-start gap-3">
        <FileTile />
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-[14px] font-bold">{{ document.title }}</h3>
          <p class="mt-1 text-[12px] text-ink3">{{ document.pages }} Halaman • {{ formatScanDate(document.scannedAt) }}</p>
        </div>
        <RowActionsMenu :document="document">
          <MoreVertical :size="18" />
        </RowActionsMenu>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <Badge :category="document.category" />
        <span class="text-[12px] text-ink3">{{ document.source }}</span>
      </div>
    </div>
  </div>
  <EmptyState v-else title="Belum ada dokumen" description="Ubah filter atau unggah dokumen baru untuk mengisi daftar." />
</template>
