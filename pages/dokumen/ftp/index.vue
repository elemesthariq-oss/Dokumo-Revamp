<script setup lang="ts">
import { ChevronLeft, ChevronRight, Filter, RefreshCw, Upload } from 'lucide-vue-next'

const docs = useDocumentsStore()
const ui = useUiStore()
const currentPage = ref(1)
const pageSize = ref(6)
const totalPages = computed(() => Math.max(1, Math.ceil(docs.filteredDocuments.length / pageSize.value)))
const pageStart = computed(() => docs.filteredDocuments.length ? (currentPage.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(currentPage.value * pageSize.value, docs.filteredDocuments.length))
const visibleDocuments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return docs.filteredDocuments.slice(start, start + pageSize.value)
})

watch(() => [
  docs.filters.categories.join(','),
  docs.filters.sources.join(','),
  docs.filters.folderId,
  docs.filters.quickAccess,
  docs.filters.from,
  docs.filters.to,
  docs.sort.key,
  docs.sort.direction,
  docs.view,
], () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value
})

async function sync() {
  await docs.runSync()
  ui.toast('Folder tersinkron', 'success')
}

function openUpload() {
  docs.setActiveFolder('')
  ui.isUploadOpen = true
}

function setPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-[24px] font-bold leading-normal tracking-[-0.02em]">Dokumen FTP</h1>
        <p class="text-[14.5px] text-ink2">Hasil auto-routing dari scanner berdasarkan kategori dokumen.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="primary" class="h-[38px] px-4" @click="openUpload">
          <Upload :size="15" /> Upload File
        </AppButton>
        <AppButton class="h-[38px] px-4" :disabled="docs.syncLoading" @click="sync">
          <RefreshCw :size="15" :class="docs.syncLoading ? 'animate-spin' : ''" /> Sync Folder
        </AppButton>
      </div>
    </header>

    <section class="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <div class="flex flex-col gap-3 px-5 py-[18px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-[16.5px] font-bold leading-normal tracking-[-0.01em]">Daftar Folder</h2>
          <p class="text-[13.5px] text-ink2">Folder tujuan hasil auto-routing berdasarkan kategori dokumen.</p>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <NuxtLink to="/dokumen/ftp/folders"><AppButton>Lihat Semua Folder</AppButton></NuxtLink>
        </div>
      </div>
      <div class="grid gap-3.5 px-5 pb-5 pt-1 md:grid-cols-2 xl:grid-cols-3">
        <FolderCard v-for="folder in docs.rootFolders" :key="folder.id" :folder="folder" :active="docs.filters.folderId === folder.id" />
      </div>
    </section>

    <section class="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <div class="relative flex flex-col gap-3 px-5 py-[18px] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-[16.5px] font-bold leading-normal tracking-[-0.01em]">Daftar Dokumen FTP</h2>
        </div>
        <div class="flex items-center gap-2">
          <AppButton :active="ui.isFilterOpen" @click="ui.isFilterOpen = !ui.isFilterOpen"><Filter :size="16" /> Filter</AppButton>
          <SegmentedControl />
        </div>
        <FilterPopover />
      </div>

      <div v-if="docs.filters.categories.length || docs.filters.sources.length || docs.filters.folderId || docs.filters.quickAccess" class="mx-5 mb-3 flex flex-wrap gap-2">
        <Chip v-for="category in docs.filters.categories" :key="category" active @click="docs.filters.categories = docs.filters.categories.filter((item) => item !== category)">{{ category }} ×</Chip>
        <Chip v-for="source in docs.filters.sources" :key="source" active @click="docs.filters.sources = docs.filters.sources.filter((item) => item !== source)">{{ source }} ×</Chip>
        <Chip v-if="docs.filters.folderId" active @click="docs.filters.folderId = ''">{{ docs.folderPathLabel(docs.filters.folderId) || 'Folder aktif' }} ×</Chip>
        <Chip v-if="docs.filters.quickAccess" active @click="docs.filters.quickAccess = ''">{{ docs.filters.quickAccess }} ×</Chip>
        <button class="text-[12px] font-bold text-brandStrong" @click="docs.clearFilters()">Reset semua</button>
      </div>

      <DocumentTable v-if="docs.view === 'list'" :documents="visibleDocuments" />
      <DocumentGrid v-else :documents="visibleDocuments" />

      <div class="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-[13px] font-medium text-ink3">
          Menampilkan <span class="font-bold text-ink2">{{ pageStart }}</span>-<span class="font-bold text-ink2">{{ pageEnd }}</span> dari <span class="font-bold text-ink2">{{ docs.filteredDocuments.length }}</span> dokumen
        </div>
        <div class="flex items-center gap-2">
          <select v-model.number="pageSize" class="h-9 rounded-btn border border-borderStrong bg-surface px-3 text-[12px] font-semibold text-ink2">
            <option :value="6">6 / halaman</option>
            <option :value="8">8 / halaman</option>
            <option :value="12">12 / halaman</option>
          </select>
          <button class="flex h-9 w-9 items-center justify-center rounded-btn border border-borderStrong text-ink3 transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage === 1" @click="setPage(currentPage - 1)">
            <ChevronLeft :size="16" />
          </button>
          <div class="flex h-9 min-w-[86px] items-center justify-center rounded-btn border border-borderStrong bg-surface px-3 text-[12px] font-bold text-ink2">
            {{ currentPage }} / {{ totalPages }}
          </div>
          <button class="flex h-9 w-9 items-center justify-center rounded-btn border border-borderStrong text-ink3 transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage === totalPages" @click="setPage(currentPage + 1)">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
