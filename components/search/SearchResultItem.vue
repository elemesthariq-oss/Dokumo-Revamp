<script setup lang="ts">
import type { SearchResult } from '~/types'

defineProps<{ result: SearchResult; active?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="`/dokumen/ftp/${result.document.id}`"
    class="flex gap-3 rounded-ctl p-3 transition"
    :class="active ? 'bg-surface2' : 'hover:bg-surface2'"
  >
    <FileTile />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="truncate text-[14px] font-bold" v-html="result.titleHtml" />
        <span v-if="result.matchedTitle" class="rounded-full bg-[#ecfeff] px-2 py-0.5 text-[10.5px] font-bold text-[#0e7490]">Cocok di judul</span>
        <span v-if="result.matchedContent" class="rounded-full bg-brandTint px-2 py-0.5 text-[10.5px] font-bold text-brandStrong">Cocok di isi</span>
      </div>
      <p class="mt-1 line-clamp-2 text-[12.5px] leading-5 text-ink2" v-html="result.snippetHtml" />
      <div class="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink3">
        <Badge :category="result.document.category" />
        <span>{{ result.document.pages }} halaman</span>
        <span>{{ formatScanDate(result.document.scannedAt) }}</span>
        <span class="font-bold text-success">{{ result.score }}% relevan</span>
      </div>
    </div>
    <span class="self-center text-[13px] font-bold" :class="active ? 'text-brand' : 'text-ink3'">Buka ›</span>
  </NuxtLink>
</template>
