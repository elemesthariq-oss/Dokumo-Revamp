<script setup lang="ts">
import { Grid2X2, List } from 'lucide-vue-next'

const docs = useDocumentsStore()
</script>

<template>
  <div class="inline-flex rounded-ctl border border-borderStrong bg-surface p-1">
    <button
      class="flex h-8 w-9 items-center justify-center rounded-[9px] transition"
      :class="docs.view === 'list' ? 'bg-brandTint text-brand' : 'text-ink3 hover:bg-surface2'"
      aria-label="Tampilan list"
      @click="docs.setView('list')"
    >
      <List :size="17" />
    </button>
    <button
      class="flex h-8 w-9 items-center justify-center rounded-[9px] transition"
      :class="docs.view === 'grid' ? 'bg-brandTint text-brand' : 'text-ink3 hover:bg-surface2'"
      aria-label="Tampilan grid"
      @click="docs.setView('grid')"
    >
      <Grid2X2 :size="17" />
    </button>
  </div>
</template>
