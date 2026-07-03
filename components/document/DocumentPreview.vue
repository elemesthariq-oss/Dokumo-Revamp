<script setup lang="ts">
import { ExternalLink, FileSearch, FileText, Image as ImageIcon } from 'lucide-vue-next'
import type { ComponentPublicInstance } from 'vue'
import { getDocumentFile } from '~/composables/useDocumentFileStorage'
import type { Document } from '~/types'

const props = defineProps<{
  document: Document
  folderLabel?: string
}>()

const activePage = ref(1)
const pageCount = ref(1)
const loading = ref(false)
const error = ref('')
const pdfInfo = ref<Record<string, string>>({})
const storedFileDataUrl = ref('')
const mainCanvas = ref<HTMLCanvasElement | null>(null)
const thumbnailCanvases = ref<Record<number, HTMLCanvasElement | null>>({})
let pdfDocument: any = null

const isPdf = computed(() => props.document.fileType?.includes('pdf'))
const isImage = computed(() => props.document.fileType?.startsWith('image/'))
const previewDataUrl = computed(() => props.document.fileDataUrl || storedFileDataUrl.value)
const pages = computed(() => Array.from({ length: Math.max(1, Math.min(pageCount.value, 24)) }, (_, index) => index + 1))
const fileSizeLabel = computed(() => props.document.fileSize ? `${Math.round(props.document.fileSize / 1024)} KB` : '-')
const fileMeta = computed(() => {
  const base: Array<{ label: string; value: string }> = [
    { label: 'Nama File', value: props.document.title },
    { label: 'Tipe File', value: props.document.fileType || '-' },
    { label: 'Ukuran', value: fileSizeLabel.value },
    { label: 'Halaman', value: `${pageCount.value}` },
    { label: 'Source', value: props.document.source },
    { label: 'Kategori', value: props.document.category },
    { label: 'Folder', value: props.folderLabel || props.document.folderId },
    { label: 'Tanggal Scan', value: formatScanDate(props.document.scannedAt) },
  ]
  const metadata = props.document.metadata
  const extracted: Array<{ label: string; value: string }> = metadata ? [
    { label: 'Nama PT', value: metadata.companyName || '' },
    { label: 'Tipe Dokumen', value: metadata.documentType || '' },
    { label: 'No. Voucher', value: metadata.voucherNumber || '' },
    { label: 'No. Dokumen', value: metadata.documentNumber || '' },
    { label: 'Tahun Dokumen', value: metadata.documentYear || '' },
    { label: 'Tanggal Dokumen', value: metadata.documentDate || '' },
    { label: 'Amount', value: metadata.amount || '' },
    { label: 'Vendor', value: metadata.vendorName || '' },
    { label: 'Confidence', value: metadata.confidence !== undefined ? `${metadata.confidence}%${metadata.needsReview ? ' - Needs Review' : ''}` : '' },
    { label: 'Extraction Source', value: metadata.extractionSource || '' },
    { label: 'Auto Folder Path', value: metadata.folderPath || '' },
  ] : []

  return [
    ...base,
    ...extracted,
    ...Object.entries(pdfInfo.value).map(([label, value]) => ({ label, value })),
  ].filter((item) => item.value && item.value !== '-')
})

const rawOcrPreview = computed(() => {
  const raw = props.document.metadata?.rawOcrText || props.document.content
  return raw.length > 420 ? `${raw.slice(0, 420)}...` : raw
})

function setThumbnailRef(page: number, element: Element | ComponentPublicInstance | null) {
  thumbnailCanvases.value[page] = element instanceof HTMLCanvasElement ? element : null
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function drawEmpty(canvas: HTMLCanvasElement | null, label = 'No preview') {
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return
  canvas.width = 720
  canvas.height = 960
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#e5e7eb'
  context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1)
  context.fillStyle = '#64748b'
  context.font = '600 28px Inter, sans-serif'
  context.textAlign = 'center'
  context.fillText(label, canvas.width / 2, canvas.height / 2)
}

async function drawImageToCanvas(canvas: HTMLCanvasElement | null, maxWidth: number, maxHeight: number) {
  if (!canvas || !previewDataUrl.value) return
  const image = new Image()
  image.src = previewDataUrl.value
  await image.decode()
  const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1)
  const width = Math.max(1, Math.round(image.naturalWidth * ratio))
  const height = Math.max(1, Math.round(image.naturalHeight * ratio))
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
}

async function renderPdfPage(pageNumber: number, canvas: HTMLCanvasElement | null, targetWidth: number) {
  if (!pdfDocument || !canvas) return
  const page = await pdfDocument.getPage(pageNumber)
  const initialViewport = page.getViewport({ scale: 1 })
  const scale = targetWidth / initialViewport.width
  const viewport = page.getViewport({ scale })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) return
  await page.render({ canvasContext: context, viewport }).promise
}

async function loadPdf() {
  if (!previewDataUrl.value) return
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
  pdfDocument = await pdfjs.getDocument({ data: dataUrlToBytes(previewDataUrl.value) }).promise
  pageCount.value = pdfDocument.numPages || props.document.pages || 1
  const metadata = await pdfDocument.getMetadata().catch(() => null)
  const info = metadata?.info ?? {}
  pdfInfo.value = Object.entries(info).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && value.trim()) acc[`PDF ${key}`] = value
    return acc
  }, {})
}

async function renderPreview() {
  if (!import.meta.client) return
  loading.value = true
  error.value = ''
  pdfInfo.value = {}
  pdfDocument = null

  try {
    storedFileDataUrl.value = props.document.fileDataUrl ? '' : await getDocumentFile(props.document.fileStorageKey)
    if (!previewDataUrl.value) {
      drawEmpty(mainCanvas.value, 'Preview file asli belum tersedia')
      return
    }

    if (isPdf.value) {
      await loadPdf()
      await nextTick()
      await renderPdfPage(activePage.value, mainCanvas.value, 760)
      for (const page of pages.value) {
        await renderPdfPage(page, thumbnailCanvases.value[page], 92)
      }
      return
    }

    if (isImage.value) {
      pageCount.value = 1
      await nextTick()
      await drawImageToCanvas(mainCanvas.value, 760, 980)
      await drawImageToCanvas(thumbnailCanvases.value[1], 92, 112)
      return
    }

    drawEmpty(mainCanvas.value, 'File preview tidak didukung')
  }
  catch {
    error.value = 'Preview file asli gagal dimuat.'
    drawEmpty(mainCanvas.value, 'Preview gagal dimuat')
  }
  finally {
    loading.value = false
  }
}

watch(() => props.document.id, () => {
  activePage.value = 1
  pageCount.value = Math.max(1, props.document.pages || 1)
  storedFileDataUrl.value = ''
  nextTick(renderPreview)
}, { immediate: true })

watch(activePage, async () => {
  if (!isPdf.value || !pdfDocument) return
  loading.value = true
  try {
    await renderPdfPage(activePage.value, mainCanvas.value, 760)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="overflow-hidden rounded-card border border-border bg-white">
    <div class="grid min-h-[760px] grid-cols-[128px_minmax(0,1fr)_300px]">
      <aside class="overflow-y-auto border-r border-border bg-white px-4 py-5">
        <button
          v-for="page in pages"
          :key="page"
          class="mb-5 block w-full text-center"
          @click="activePage = page"
        >
          <span
            class="flex h-[118px] w-[92px] items-center justify-center overflow-hidden rounded-[7px] border bg-white shadow-sm transition"
            :class="activePage === page ? 'border-[#22c55e] ring-1 ring-[#22c55e]' : 'border-border hover:border-brandTint2'"
          >
            <canvas :ref="(element) => setThumbnailRef(page, element)" class="max-h-full max-w-full" />
          </span>
          <span class="mt-1.5 block text-[11px] font-semibold text-ink">{{ page }}</span>
        </button>
      </aside>

      <main class="overflow-auto bg-[#edf3f8] px-10 py-8">
        <div class="mx-auto w-fit min-w-[580px] rounded-[16px] bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-[18px] font-bold text-ink">Page {{ activePage }} Preview</h2>
              <p class="mt-1 text-[12.5px] text-ink3">{{ document.title }}</p>
            </div>
            <a
              v-if="previewDataUrl"
              :href="previewDataUrl"
              :download="document.title"
              target="_blank"
              rel="noreferrer"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-btn border border-borderStrong bg-surface px-3 text-[12.5px] font-semibold text-ink2 transition hover:bg-surface2"
            >
              <ExternalLink :size="15" /> Buka File
            </a>
          </div>
          <div class="relative">
            <canvas ref="mainCanvas" class="max-w-full rounded-[6px] bg-white shadow-[0_0_0_1px_rgba(226,232,240,0.9)]" />
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center rounded-[6px] bg-white/70 text-[13px] font-bold text-brandStrong">Memuat preview...</div>
          </div>
          <div v-if="error" class="mt-3 rounded-btn bg-danger/10 px-3 py-2 text-[12px] font-semibold text-danger">{{ error }}</div>
        </div>
      </main>

      <aside class="border-l border-border bg-white p-5">
        <div class="rounded-[8px] border border-border p-4">
          <h2 class="text-[15px] font-bold text-ink">Metadata</h2>
          <p class="mt-1 text-[12.5px] text-ink2">Field dari file dan hasil ekstraksi OCR</p>
          <div class="mt-4 space-y-3">
            <label v-for="item in fileMeta" :key="item.label" class="block">
              <span class="text-[11.5px] font-bold text-ink">{{ item.label }}</span>
              <input :value="item.value" readonly class="mt-1 h-9 w-full rounded-[7px] border border-borderStrong bg-[#f8fafc] px-2 text-[12px] text-ink2">
            </label>
          </div>
        </div>

        <div class="mt-4 rounded-[8px] border border-border p-4">
          <h3 class="text-[13px] font-bold text-ink">Preview Source</h3>
          <div class="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-ink2">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brandTint text-brandStrong">
              <ImageIcon v-if="isImage" :size="16" />
              <FileText v-else-if="isPdf" :size="16" />
              <FileSearch v-else :size="16" />
            </span>
            <span>{{ previewDataUrl ? 'File asli tersimpan' : 'Metadata/OCR demo' }}</span>
          </div>
        </div>

        <div v-if="rawOcrPreview" class="mt-4 rounded-[8px] border border-border p-4">
          <h3 class="text-[13px] font-bold text-ink">Raw OCR</h3>
          <p class="mt-2 max-h-44 overflow-y-auto text-[12px] leading-5 text-ink2">{{ rawOcrPreview }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>
