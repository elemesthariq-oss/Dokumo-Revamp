<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import type { Category, SearchScope } from '~/types'

const ui = useUiStore()
const docs = useDocumentsStore()
const router = useRouter()
const input = ref<HTMLInputElement | null>(null)
const selected = ref(0)
const thinking = ref(false)
const searchFilters = reactive({
  categories: [] as Category[],
  sources: [] as string[],
  folderId: '',
  from: '',
  to: '',
})
let timer: number | undefined

const effectiveSearchFilters = computed(() => ({
  ...searchFilters,
  folderIds: searchFilters.folderId ? [searchFilters.folderId, ...docs.descendantFolderIds(searchFilters.folderId)] : [],
}))
const results = computed(() => searchDocuments(docs.documents, ui.searchQuery, ui.searchScope, effectiveSearchFilters.value))
const recent = computed(() => [...docs.documents].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, 3))

watch(() => ui.isSearchOpen, async (open) => {
  if (open) {
    await nextTick()
    input.value?.focus()
  }
})

watch(() => ui.searchQuery, () => {
  selected.value = 0
  thinking.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    thinking.value = false
  }, 420)
})

function setScope(scope: SearchScope) {
  ui.searchScope = scope
}

function clearAdvancedFilters() {
  searchFilters.categories = []
  searchFilters.sources = []
  searchFilters.folderId = ''
  searchFilters.from = ''
  searchFilters.to = ''
}

function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') ui.closeSearch()
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selected.value = Math.min(selected.value + 1, Math.max(results.value.length - 1, 0))
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selected.value = Math.max(selected.value - 1, 0)
  }
  if (event.key === 'Enter' && results.value[selected.value]) {
    router.push(`/dokumen/ftp/${results.value[selected.value].document.id}`)
    ui.closeSearch()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isSearchOpen" class="fixed inset-0 z-[75] bg-[#1c1733]/70 px-4 pt-[8vh]" @click.self="ui.closeSearch">
      <div class="mx-auto w-full max-w-[720px] overflow-hidden rounded-[18px] bg-surface shadow-modal" role="dialog" aria-modal="true" @keydown="keydown">
        <div class="flex items-center gap-3 border-b border-border px-4 py-3">
          <span class="brand-gradient flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-white"><Sparkles :size="15" /></span>
          <input ref="input" v-model="ui.searchQuery" class="h-9 flex-1 bg-transparent text-[16.5px] font-medium text-ink placeholder:text-ink3" placeholder="Cari dokumen lewat judul atau isi...">
          <Kbd>Esc</Kbd>
        </div>
        <div class="border-b border-border px-4 py-3">
          <div class="flex flex-wrap gap-2">
            <Chip :active="ui.searchScope === 'both'" @click="setScope('both')">Judul & Isi</Chip>
            <Chip :active="ui.searchScope === 'title'" @click="setScope('title')">Judul saja</Chip>
            <Chip :active="ui.searchScope === 'content'" @click="setScope('content')">Isi dokumen</Chip>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-5">
            <select v-model="searchFilters.folderId" class="h-9 rounded-btn border border-borderStrong bg-surface px-2 text-[12px] text-ink2">
              <option value="">Semua folder</option>
              <option v-for="folder in docs.folders" :key="folder.id" :value="folder.id">{{ docs.folderPathLabel(folder.id) }}</option>
            </select>
            <select v-model="searchFilters.categories" multiple class="h-9 rounded-btn border border-borderStrong bg-surface px-2 text-[12px] text-ink2">
              <option v-for="category in docs.categories" :key="category" :value="category">{{ category }}</option>
            </select>
            <select v-model="searchFilters.sources" multiple class="h-9 rounded-btn border border-borderStrong bg-surface px-2 text-[12px] text-ink2">
              <option v-for="source in docs.sources" :key="source" :value="source">{{ source }}</option>
            </select>
            <input v-model="searchFilters.from" type="date" class="h-9 rounded-btn border border-borderStrong bg-surface px-2 text-[12px] text-ink2">
            <input v-model="searchFilters.to" type="date" class="h-9 rounded-btn border border-borderStrong bg-surface px-2 text-[12px] text-ink2">
          </div>
          <button class="mt-2 text-[12px] font-bold text-brandStrong" @click="clearAdvancedFilters">Reset advanced filter</button>
        </div>
        <div class="px-4 py-3">
          <div v-if="ui.searchQuery" class="mb-2 flex items-center gap-2 text-[13px] text-ink2">
            <Sparkles :size="15" class="text-brand" />
            <span v-if="thinking">AI sedang menelusuri judul & isi dokumen...</span>
            <span v-else>AI menemukan <b class="text-brandStrong">{{ results.length }} dokumen</b> yang relevan - diurutkan berdasarkan kecocokan.</span>
          </div>

          <div v-if="!ui.searchQuery" class="space-y-3">
            <div class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Saran pencarian</div>
            <div class="flex flex-wrap gap-2">
              <Chip @click="ui.searchQuery = 'perjanjian kredit kendaraan'">perjanjian kredit kendaraan</Chip>
              <Chip @click="ui.searchQuery = 'slip gaji maret'">slip gaji maret</Chip>
              <Chip @click="ui.searchQuery = 'npwp perusahaan'">npwp perusahaan</Chip>
            </div>
            <div class="pt-2 text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Dokumen terbaru</div>
            <NuxtLink v-for="doc in recent" :key="doc.id" :to="`/dokumen/ftp/${doc.id}`" class="flex items-center gap-3 rounded-ctl p-2 hover:bg-surface2" @click="ui.closeSearch">
              <FileTile size="sm" />
              <span class="min-w-0 flex-1 truncate text-[13px] font-semibold">{{ doc.title }}</span>
              <span class="text-[12px] text-ink3">{{ formatScanDate(doc.scannedAt) }}</span>
            </NuxtLink>
          </div>

          <div v-else-if="!thinking && results.length" class="max-h-[410px] overflow-y-auto">
            <SearchResultItem v-for="(result, index) in results" :key="result.document.id" :result="result" :active="index === selected" @click="ui.closeSearch" />
          </div>

          <EmptyState v-else-if="!thinking" title="Tidak ada hasil" description="Coba gunakan kata kunci lain atau ubah scope pencarian." />
        </div>
        <div class="flex items-center justify-between border-t border-border px-4 py-3 text-[11.5px] text-ink3">
          <span><Kbd>↑ ↓</Kbd> navigasi <Kbd>↵</Kbd> buka</span>
          <span class="font-semibold text-brandStrong">Memahami maksud & mencari di dalam isi dokumen</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
