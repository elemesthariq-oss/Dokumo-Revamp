<script setup lang="ts">
import type { Category } from '~/types'
import type { DocumentMetadata } from '~/types'

const ui = useUiStore()
const docs = useDocumentsStore()
const document = computed(() => docs.documents.find((item) => item.id === ui.editingDocumentId))
const title = ref('')
const pages = ref(1)
const source = ref('')
const category = ref<Category>('Administrasi')
const folderId = ref('')
const content = ref('')
const routeAutomatically = ref(false)
const metadata = reactive<DocumentMetadata>({})

watch(() => ui.isEditDocumentOpen, (open) => {
  if (!open || !document.value) return
  title.value = document.value.title
  pages.value = document.value.pages
  source.value = document.value.source
  category.value = document.value.category
  folderId.value = document.value.folderId
  content.value = document.value.content
  routeAutomatically.value = false
  resetMetadata()
  Object.assign(metadata, document.value.metadata ?? {})
})

function close() {
  ui.isEditDocumentOpen = false
  ui.editingDocumentId = ''
}

function submit() {
  if (!document.value || !title.value.trim()) return
  docs.updateDocument(document.value.id, {
    title: title.value.trim(),
    pages: pages.value,
    source: source.value.trim() || 'Upload Manual',
    category: category.value,
    folderId: routeAutomatically.value ? 'auto' : folderId.value,
    content: content.value.trim(),
    metadata: normalizedMetadata(),
  })
  ui.toast('File diperbarui', 'success')
  close()
}

function normalizedMetadata(): DocumentMetadata {
  const reviewMissing = !metadata.companyName?.trim() || !metadata.documentType?.trim() || !(metadata.voucherNumber?.trim() || metadata.documentNumber?.trim()) || !metadata.documentYear?.trim()
  return {
    ...metadata,
    companyName: metadata.companyName?.trim(),
    documentType: metadata.documentType?.trim(),
    documentNumber: metadata.documentNumber?.trim(),
    voucherNumber: metadata.voucherNumber?.trim(),
    documentYear: metadata.documentYear?.trim(),
    documentDate: metadata.documentDate?.trim(),
    amount: metadata.amount?.trim(),
    vendorName: metadata.vendorName?.trim(),
    rawOcrText: metadata.rawOcrText || content.value.trim(),
    extractionSource: metadata.extractionSource || 'manual',
    confidence: Math.max(Number(metadata.confidence || 0), reviewMissing ? 0 : 75),
    needsReview: reviewMissing,
  }
}

function resetMetadata() {
  for (const key of Object.keys(metadata) as Array<keyof DocumentMetadata>) delete metadata[key]
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isEditDocumentOpen && document" class="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1733]/45 p-4" @click.self="close">
      <form class="w-full max-w-2xl rounded-[18px] bg-surface p-5 shadow-modal" @submit.prevent="submit">
        <h2 class="text-[16px] font-bold">Edit file</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Nama file
            <input v-model="title" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Halaman
            <input v-model.number="pages" min="1" type="number" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Source
            <input v-model="source" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Kategori
            <select v-model="category" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
              <option v-for="item in docs.categories" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3 sm:col-span-2">Folder
            <select v-model="folderId" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
              <option v-for="folder in docs.folders" :key="folder.id" :value="folder.id">{{ docs.folderPathLabel(folder.id) }}</option>
            </select>
          </label>
        </div>
        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Teks OCR / searchable content</label>
        <textarea v-model="content" class="mt-1 min-h-32 w-full rounded-btn border border-borderStrong px-3 py-2 text-[14px]" />

        <div class="mt-4 rounded-card border border-border bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-[14px] font-bold text-ink">Metadata Auto Filing</h3>
              <p class="mt-1 text-[12px] text-ink3">Ubah metadata lalu aktifkan re-route untuk memindahkan file ke folder otomatis baru.</p>
            </div>
            <label class="flex items-center gap-2 text-[12.5px] font-bold text-brandStrong">
              <input v-model="routeAutomatically" type="checkbox" class="h-4 w-4 rounded border-borderStrong">
              Re-route otomatis
            </label>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Nama PT
              <input v-model="metadata.companyName" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Tipe Dokumen
              <input v-model="metadata.documentType" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">No. Voucher
              <input v-model="metadata.voucherNumber" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">No. Dokumen
              <input v-model="metadata.documentNumber" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Tahun
              <input v-model="metadata.documentYear" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Tanggal Dokumen
              <input v-model="metadata.documentDate" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Amount
              <input v-model="metadata.amount" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Vendor
              <input v-model="metadata.vendorName" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            </label>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <AppButton @click="close">Batal</AppButton>
          <AppButton variant="primary" type="submit">Simpan File</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
