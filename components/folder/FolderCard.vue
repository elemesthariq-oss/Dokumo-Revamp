<script setup lang="ts">
import { Folder } from 'lucide-vue-next'
import type { Folder as FolderType } from '~/types'

defineProps<{ folder: FolderType; active?: boolean; to?: string }>()
const docs = useDocumentsStore()
</script>

<template>
  <NuxtLink
    :to="to || `/dokumen/ftp/folder/${folder.id}`"
    class="flex min-h-[70px] items-center gap-3.5 rounded-[14px] border bg-surface p-3.5 text-left transition hover:-translate-y-px hover:shadow-sm"
    :class="active ? 'border-brandTint2 ring-2 ring-brandTint' : 'border-border'"
  >
    <span class="flex h-[42px] w-[42px] items-center justify-center text-[#fbbf24]">
      <Folder :size="33" fill="#fbbf24" stroke-width="1.5" />
    </span>
    <span>
      <span class="block text-[14.5px] font-semibold text-ink">{{ folder.name }}</span>
      <span class="block text-[12.5px] text-ink3">{{ docs.folderCounts[folder.id] ?? folder.count }} Dokumen</span>
    </span>
  </NuxtLink>
</template>
