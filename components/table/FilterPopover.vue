<script setup lang="ts">
const docs = useDocumentsStore()
const ui = useUiStore()
</script>

<template>
  <div v-if="ui.isFilterOpen" class="absolute right-0 top-12 z-20 w-[330px] rounded-card border border-border bg-surface p-4 shadow-sm">
    <div class="mb-3 text-[13px] font-bold">Filter Dokumen</div>
    <div class="space-y-3">
      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-ink3">Kategori</div>
        <label v-for="category in docs.categories" :key="category" class="mb-1 flex items-center gap-2 text-[13px] text-ink2">
          <input v-model="docs.filters.categories" :value="category" type="checkbox" class="accent-[#6d5efc]">
          {{ category }}
        </label>
      </div>
      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-ink3">Source</div>
        <label v-for="source in docs.sources" :key="source" class="mb-1 flex items-center gap-2 text-[13px] text-ink2">
          <input v-model="docs.filters.sources" :value="source" type="checkbox" class="accent-[#6d5efc]">
          {{ source }}
        </label>
      </div>
      <label class="block text-[12px] font-semibold text-ink3">Folder
        <select v-model="docs.filters.folderId" class="mt-1 h-9 w-full rounded-btn border border-borderStrong px-2 text-[12px] text-ink">
          <option value="">Semua folder</option>
          <option v-for="folder in docs.folders" :key="folder.id" :value="folder.id">{{ docs.folderPathLabel(folder.id) }}</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-[12px] font-semibold text-ink3">Dari
          <input v-model="docs.filters.from" type="date" class="mt-1 h-9 w-full rounded-btn border border-borderStrong px-2 text-[12px]">
        </label>
        <label class="text-[12px] font-semibold text-ink3">Sampai
          <input v-model="docs.filters.to" type="date" class="mt-1 h-9 w-full rounded-btn border border-borderStrong px-2 text-[12px]">
        </label>
      </div>
      <div class="flex justify-between pt-2">
        <AppButton @click="docs.clearFilters()">Reset</AppButton>
        <AppButton variant="primary" @click="ui.isFilterOpen = false; ui.toast('Filter diterapkan', 'success')">Terapkan</AppButton>
      </div>
    </div>
  </div>
</template>
