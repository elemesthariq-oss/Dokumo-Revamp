<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next'
import { buildAutoFolderSegments, extractAutoFilingFromDataUrl, inferCategory, parseDocumentMetadata } from '~/composables/useDocumentAutoFiling'
import type { Category, DocumentMetadata } from '~/types'

const ui = useUiStore()
const docs = useDocumentsStore()
const fileName = ref('')
const fileType = ref('application/pdf')
const fileSize = ref(0)
const fileDataUrl = ref('')
const fileError = ref('')
const extractingText = ref(false)
const extractionStatus = ref('')
const submitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const category = ref<Category>('Administrasi')
const folderId = ref('auto')
const pages = ref(1)
const source = ref('Upload Manual')
const content = ref('')
const metadata = reactive<DocumentMetadata>({})
const targetPath = computed(() => buildAutoFolderSegments({ ...metadata, needsReview: isMetadataIncomplete(metadata) }, fileName.value).join(' / '))
let extractionRunId = 0

watch(() => ui.isUploadOpen, (open) => {
  if (!open) return
  folderId.value = docs.activeFolderId || 'auto'
  submitting.value = false
})

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  fileName.value = file?.name ?? ''
  fileType.value = file?.type || 'application/pdf'
  fileSize.value = file?.size ?? 0
  fileDataUrl.value = ''
  fileError.value = ''
  extractingText.value = false
  extractionStatus.value = ''
  resetMetadata()
  if (!file) return
  const fallback = parseDocumentMetadata('', file.name, 'filename')
  Object.assign(metadata, fallback)
  category.value = inferCategory(fallback)
  content.value = ''

  const reader = new FileReader()
  reader.onload = async () => {
    fileDataUrl.value = typeof reader.result === 'string' ? reader.result : ''
    if (fileDataUrl.value) {
      extractionStatus.value = 'File siap diunggah. OCR berjalan di background.'
      void runAutoExtraction(3)
    }
  }
  reader.onerror = () => {
    fileError.value = 'File gagal dibaca untuk preview.'
  }
  reader.readAsDataURL(file)
}

async function runAutoExtraction(maxOcrPages: number) {
  if (!fileDataUrl.value) return
  const runId = extractionRunId + 1
  extractionRunId = runId
  extractingText.value = true
  fileError.value = ''
  try {
    const extracted = await extractAutoFilingFromDataUrl(fileDataUrl.value, fileType.value, fileName.value, {
      maxOcrPages,
      onStatus: (status) => {
        if (runId !== extractionRunId) return
        extractionStatus.value = status
      },
    })
    if (runId !== extractionRunId || !ui.isUploadOpen) return
    pages.value = extracted.pages || pages.value
    content.value = extracted.text || content.value
    Object.assign(metadata, extracted.metadata)
    category.value = extracted.category
    folderId.value = 'auto'
    extractionStatus.value = extracted.metadata.needsReview
      ? 'Metadata perlu direview sebelum upload'
      : 'Metadata dan folder tujuan siap'
  }
  catch {
    if (runId !== extractionRunId || !ui.isUploadOpen) return
    const fallback = parseDocumentMetadata(content.value, fileName.value, 'manual')
    Object.assign(metadata, fallback)
    category.value = inferCategory(fallback)
    fileError.value = 'OCR gagal atau terlalu lama. File tetap bisa diunggah dan direview nanti.'
    extractionStatus.value = 'Butuh review manual'
  }
  finally {
    if (runId === extractionRunId) extractingText.value = false
  }
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  extractionRunId += 1
  if (extractingText.value) {
    extractionStatus.value = 'OCR belum selesai, file tetap diunggah untuk direview nanti.'
    extractingText.value = false
  }
  try {
    await docs.addDocument({
      title: fileName.value || `upload_${Date.now()}.pdf`,
      category: category.value,
      folderId: folderId.value,
      pages: pages.value,
      source: source.value,
      content: content.value,
      fileType: fileType.value,
      fileSize: fileSize.value,
      fileDataUrl: fileDataUrl.value,
      metadata: normalizedMetadata(),
    })
    ui.toast('Dokumen berhasil diunggah', 'success')
    ui.isUploadOpen = false
    resetForm()
    navigateTo('/dokumen/ftp')
  }
  catch {
    submitting.value = false
    fileError.value = 'File gagal disimpan di browser storage. Coba file yang lebih kecil atau refresh halaman.'
    ui.toast('Upload gagal disimpan', 'error')
  }
}

function refreshMetadataFromFields() {
  const parsed = parseDocumentMetadata(content.value, fileName.value, content.value.trim() ? 'manual' : 'filename')
  Object.assign(metadata, {
    ...parsed,
    companyName: metadata.companyName || parsed.companyName,
    documentType: metadata.documentType || parsed.documentType,
    documentNumber: metadata.documentNumber || parsed.documentNumber,
    voucherNumber: metadata.voucherNumber || parsed.voucherNumber,
    documentYear: metadata.documentYear || parsed.documentYear,
    documentDate: metadata.documentDate || parsed.documentDate,
    amount: metadata.amount || parsed.amount,
    vendorName: metadata.vendorName || parsed.vendorName,
  })
  category.value = inferCategory(metadata)
}

function normalizedMetadata(): DocumentMetadata {
  const reviewMissing = isMetadataIncomplete(metadata)
  const confidence = Math.max(Number(metadata.confidence || 0), reviewMissing ? 0 : 75)
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
    confidence,
    needsReview: reviewMissing,
  }
}

function isMetadataIncomplete(value: DocumentMetadata) {
  return !value.companyName?.trim() || !value.documentType?.trim() || !(value.voucherNumber?.trim() || value.documentNumber?.trim()) || !value.documentYear?.trim()
}

function resetMetadata() {
  for (const key of Object.keys(metadata) as Array<keyof DocumentMetadata>) delete metadata[key]
}

function resetForm() {
  extractionRunId += 1
  fileName.value = ''
  folderId.value = 'auto'
  pages.value = 1
  source.value = 'Upload Manual'
  content.value = ''
  fileDataUrl.value = ''
  fileError.value = ''
  extractingText.value = false
  extractionStatus.value = ''
  submitting.value = false
  if (fileInput.value) fileInput.value.value = ''
  resetMetadata()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isUploadOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1733]/45 p-4" @click.self="ui.isUploadOpen = false">
      <form class="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[18px] bg-surface p-5 shadow-modal" @submit.prevent="submit">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-[17px] font-bold">Unggah Dokumen</h2>
            <p class="mt-1 text-[13px] text-ink3">Upload file PDF/gambar, Dokumo akan membaca metadata dan membuat folder tujuan otomatis.</p>
          </div>
          <button type="button" class="rounded-full px-2 text-ink3 hover:bg-surface2" @click="ui.isUploadOpen = false">Esc</button>
        </div>

        <label class="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-borderStrong bg-surface2 p-6 text-center hover:border-brand">
          <UploadCloud class="text-brand" :size="34" />
          <span class="mt-3 text-[14px] font-bold text-ink">{{ fileName || 'Tarik file ke sini atau pilih file' }}</span>
          <span class="mt-1 text-[12px] text-ink3">{{ extractingText ? extractionStatus || 'Mengekstrak isi dokumen...' : fileDataUrl ? extractionStatus || 'File asli siap dipreview dan dicari di detail dokumen' : 'Menerima .pdf, .png, .jpg, .jpeg' }}</span>
          <span v-if="fileError" class="mt-1 text-[12px] font-semibold text-danger">{{ fileError }}</span>
          <input ref="fileInput" type="file" accept=".pdf,image/*" class="sr-only" @change="onFile">
        </label>

        <div v-if="fileDataUrl" class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-btn border border-border bg-surface2 px-3 py-2">
          <span class="text-[12.5px] font-semibold text-ink2">Target folder: <b class="text-brandStrong">{{ targetPath }}</b></span>
          <button type="button" class="text-[12px] font-bold text-brandStrong hover:underline" :disabled="extractingText" @click="runAutoExtraction(999)">OCR semua halaman</button>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Source
            <input v-model="source" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Jumlah halaman
            <input v-model.number="pages" min="1" type="number" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Kategori
            <select v-model="category" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
              <option v-for="item in docs.categories" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Folder tujuan
            <select v-model="folderId" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
              <option value="auto">Auto-routing oleh AI</option>
              <option v-for="folder in docs.folders" :key="folder.id" :value="folder.id">{{ docs.folderPathLabel(folder.id) }}</option>
            </select>
          </label>
        </div>

        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Teks OCR / catatan AI</label>
        <textarea v-model="content" class="mt-1 min-h-28 w-full rounded-btn border border-borderStrong px-3 py-2 text-[14px]" placeholder="Opsional. Isi teks ini supaya file upload bisa ditemukan lewat Advanced AI Search." @blur="refreshMetadataFromFields" />

        <div class="mt-4 rounded-card border border-border bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-[14px] font-bold text-ink">Hasil Auto Filing</h3>
              <p class="mt-1 text-[12px] text-ink3">Koreksi field ini kalau OCR kurang akurat sebelum upload final.</p>
            </div>
            <span class="rounded-full px-3 py-1 text-[12px] font-bold" :class="metadata.needsReview ? 'bg-warning/10 text-warning' : 'bg-brandTint text-brandStrong'">
              {{ metadata.needsReview ? 'Needs Review' : `${metadata.confidence || 0}% confidence` }}
            </span>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Nama PT
              <input v-model="metadata.companyName" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink" placeholder="PT ...">
            </label>
            <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Tipe Dokumen
              <input v-model="metadata.documentType" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink" placeholder="Voucher / Invoice">
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
          <AppButton @click="ui.isUploadOpen = false">Batal</AppButton>
          <AppButton variant="primary" type="submit" :disabled="submitting">{{ submitting ? 'Mengunggah...' : 'Unggah' }}</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
