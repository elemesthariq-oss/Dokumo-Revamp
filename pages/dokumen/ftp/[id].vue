<script setup lang="ts">
import { Download, Edit3, Share2, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const docs = useDocumentsStore()
const ui = useUiStore()
const doc = computed(() => docs.documents.find((item) => item.id === route.params.id))
const folder = computed(() => docs.folders.find((item) => item.id === doc.value?.folderId))
const fileSizeLabel = computed(() => doc.value?.fileSize ? `${Math.round(doc.value.fileSize / 1024)} KB` : '-')
const hasPreviewFile = computed(() => Boolean(doc.value?.fileDataUrl || doc.value?.fileStorageKey))

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
        <DocumentPreview :document="doc" :folder-label="folder ? docs.folderPathLabel(folder.id) : ''" />
      </section>

      <section class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h2 class="text-[15px] font-bold">Isi OCR</h2>
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
