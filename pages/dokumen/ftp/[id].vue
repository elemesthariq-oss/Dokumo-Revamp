<script setup lang="ts">
import { Download, Edit3, Share2, Sparkles, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const docs = useDocumentsStore()
const ui = useUiStore()
const doc = computed(() => docs.documents.find((item) => item.id === route.params.id))
const folder = computed(() => docs.folders.find((item) => item.id === doc.value?.folderId))
const fileSizeLabel = computed(() => doc.value?.fileSize ? `${Math.round(doc.value.fileSize / 1024)} KB` : '-')
const hasPreviewFile = computed(() => Boolean(doc.value?.fileDataUrl || doc.value?.fileStorageKey))

/* ---- deep-link from Tanya Dokumen sources ---- */
const highlightActive = ref(false)
const initialPage = computed(() => {
  const page = Number(route.query.page)
  return Number.isFinite(page) && page > 0 ? page : undefined
})
const highlightSection = computed(() => {
  const section = route.query.section
  return typeof section === 'string' ? section : ''
})
const sectionLabel = computed(() => doc.value?.metadata?.sections?.find((item) => item.anchor === highlightSection.value)?.label || '')
const ocrRef = ref<HTMLElement | null>(null)

function applyDeepLink() {
  if (route.query.highlight !== doc.value?.id) return
  highlightActive.value = true
  nextTick(() => {
    ocrRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  window.setTimeout(() => { highlightActive.value = false }, 2600)
}

onMounted(applyDeepLink)
watch(() => [route.query.highlight, route.query.section, doc.value?.id], applyDeepLink)

function clearHighlightQuery() {
  const query = { ...route.query }
  delete query.highlight
  delete query.page
  delete query.section
  void router.replace({ path: route.path, query })
  highlightActive.value = false
}

function removeDoc() {
  if (!doc.value) return
  if (window.confirm('Hapus dokumen ini?')) {
    docs.removeDocument(doc.value.id)
    ui.toast('Dokumen dihapus', 'success')
    navigateTo('/dokumen/ftp')
  }
}
</script>

<template>
  <PageShell v-if="doc" :title="doc.title" subtitle="Detail dokumen hasil scan dan OCR.">
    <div
      v-if="highlightActive"
      class="mb-4 flex items-center gap-2.5 rounded-card border border-brandTint2 bg-brandTint px-4 py-3 text-[13px] text-brandStrong"
    >
      <Sparkles :size="16" class="shrink-0" />
      <span class="min-w-0 flex-1">
        Dibuka dari <strong>Tanya Dokumen</strong>.
        <template v-if="sectionLabel">Bagian yang dirujuk: <strong>{{ sectionLabel }}</strong><template v-if="initialPage"> (Hal. {{ initialPage }})</template>.</template>
      </span>
      <button class="shrink-0 rounded-btn px-2 py-1 text-[12px] font-bold hover:bg-brandTint2" @click="clearHighlightQuery">Tutup</button>
    </div>

    <div class="mb-4 flex flex-wrap justify-end gap-2">
      <AppButton @click="ui.openEditDocument(doc.id)"><Edit3 :size="16" /> Edit File</AppButton>
      <AppButton @click="ui.openShare(doc.id)"><Share2 :size="16" /> Bagikan</AppButton>
      <AppButton @click="ui.toast(`Mengunduh ${docs.downloadDocument(doc.id)}`, 'success')"><Download :size="16" /> Unduh</AppButton>
      <AppButton @click="removeDoc"><Trash2 :size="16" /> Hapus</AppButton>
    </div>
    <div class="space-y-4">
      <section class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <div class="mb-4 flex items-center gap-3">
          <FileTile />
          <div>
            <Badge :category="doc.category" />
            <p class="mt-2 text-[13px] text-ink3">{{ doc.source }} • {{ formatScanDate(doc.scannedAt) }}</p>
          </div>
        </div>
        <DocumentPreview :document="doc" :initial-page="initialPage" :folder-label="folder ? docs.folderPathLabel(folder.id) : ''" />
      </section>

      <section
        ref="ocrRef"
        class="rounded-card border bg-surface p-5 shadow-sm transition-colors duration-500"
        :class="highlightActive ? 'border-brand ring-2 ring-brandTint2' : 'border-border'"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-[15px] font-bold">Isi OCR</h2>
          <span v-if="highlightActive && sectionLabel" class="rounded-full bg-brandTint px-2.5 py-0.5 text-[11px] font-bold text-brandStrong">{{ sectionLabel }}</span>
        </div>
        <p class="mt-2 leading-7 text-ink2">{{ doc.content }}</p>
      </section>
      <aside class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h2 class="text-[15px] font-bold">Metadata</h2>
        <dl class="mt-3 space-y-3 text-[13px]">
          <div class="flex justify-between"><dt class="text-ink3">Halaman</dt><dd class="font-semibold">{{ doc.pages }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-ink3">Folder</dt><dd class="text-right font-semibold"><NuxtLink v-if="folder" :to="`/dokumen/ftp/folder/${folder.id}`" class="text-brandStrong">{{ docs.folderPathLabel(folder.id) }}</NuxtLink></dd></div>
          <div class="flex justify-between"><dt class="text-ink3">Ukuran</dt><dd class="font-semibold">{{ fileSizeLabel }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink3">Preview</dt><dd class="font-semibold">{{ hasPreviewFile ? 'Tersedia' : 'Tidak ada' }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink3">Shared</dt><dd class="font-semibold">{{ doc.sharedWithMe ? 'Ya' : 'Tidak' }}</dd></div>
        </dl>
      </aside>
    </div>
  </PageShell>
  <EmptyState v-else title="Dokumen tidak ditemukan" description="Dokumen mungkin sudah dihapus dari daftar." />
</template>
