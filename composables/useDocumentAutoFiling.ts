import type { Category, DocumentMetadata } from '~/types'

export interface AutoFilingResult {
  pages: number
  text: string
  metadata: DocumentMetadata
  category: Category
}

export interface AutoFilingOptions {
  maxOcrPages?: number
  onStatus?: (status: string) => void
}

const fallbackYear = String(new Date().getFullYear())

export function buildAutoFolderSegments(metadata?: DocumentMetadata, title = '') {
  const type = cleanSegment(metadata?.documentType || inferDocumentType(title) || 'Dokumen Upload')
  const year = cleanSegment(metadata?.documentYear || inferYear(title) || fallbackYear)

  if (metadata?.needsReview) {
    return ['Needs Review', type, year]
  }

  return [
    cleanSegment(metadata?.companyName || 'PT Tidak Teridentifikasi'),
    type,
    cleanSegment(metadata?.voucherNumber || metadata?.documentNumber || stripExtension(title) || 'Tanpa Nomor'),
    year,
  ]
}

export function parseDocumentMetadata(text: string, title: string, source: DocumentMetadata['extractionSource'] = 'manual'): DocumentMetadata {
  const normalized = normalizeText(`${text}\n${title}`)
  const normalizedText = normalizeText(text)
  const titleText = stripExtension(title)
  const companyName = extractCompany(normalized)
  const documentType = inferDocumentType(`${normalized} ${title}`)
  const documentNumber = extractDocumentNumber(normalizedText) || inferNumberFromTitle(titleText)
  const voucherNumber = extractVoucherNumber(normalizedText) || (documentType.toLowerCase().includes('voucher') ? documentNumber : '')
  const documentYear = inferYear(normalized) || inferYear(titleText) || fallbackYear
  const documentDate = extractDate(normalized)
  const amount = extractAmount(normalized)
  const vendorName = extractVendor(normalized)
  const confidence = Math.min(100, Math.round(
    (companyName ? 24 : 0)
    + (documentType ? 18 : 0)
    + (documentNumber || voucherNumber ? 22 : 0)
    + (documentYear ? 12 : 0)
    + (documentDate ? 8 : 0)
    + (amount ? 8 : 0)
    + (vendorName ? 8 : 0),
  ))

  return {
    companyName,
    documentType,
    documentNumber,
    voucherNumber,
    documentYear,
    documentDate,
    amount,
    vendorName,
    confidence,
    extractionSource: source,
    rawOcrText: text.trim(),
    needsReview: confidence < 55,
  }
}

export function inferCategory(metadata?: DocumentMetadata): Category {
  const type = `${metadata?.documentType ?? ''} ${metadata?.rawOcrText ?? ''}`.toLowerCase()
  if (type.includes('voucher') || type.includes('invoice') || type.includes('faktur') || type.includes('payment') || type.includes('vanpay')) return 'Keuangan'
  if (type.includes('agreement') || type.includes('kontrak') || type.includes('legal')) return 'Legal'
  if (type.includes('gaji') || type.includes('payroll')) return 'Payroll'
  if (type.includes('training') || type.includes('sertifikat')) return 'Training & Sertifikasi'
  return 'Administrasi'
}

export async function extractAutoFilingFromDataUrl(dataUrl: string, fileType: string, title: string, options: AutoFilingOptions = {}): Promise<AutoFilingResult> {
  options.onStatus?.('Membaca file')
  if (fileType.includes('pdf')) return extractFromPdf(dataUrl, title, options)
  if (fileType.startsWith('image/')) return extractFromImage(dataUrl, title, options)

  const metadata = parseDocumentMetadata('', title, 'filename')
  return {
    pages: 1,
    text: fallbackSearchableText(title, metadata),
    metadata,
    category: inferCategory(metadata),
  }
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function extractFromPdf(dataUrl: string, title: string, options: AutoFilingOptions) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
  const pdf = await pdfjs.getDocument({ data: dataUrlToBytes(dataUrl) }).promise
  const embeddedText: string[] = []

  options.onStatus?.('Mengekstrak text layer PDF')
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => 'str' in item ? item.str : '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) embeddedText.push(pageText)
  }

  let text = embeddedText.join('\n\n')
  let source: DocumentMetadata['extractionSource'] = text.length >= 80 ? 'pdf-text' : 'filename'

  if (text.length < 80) {
    options.onStatus?.('Menjalankan OCR pada scan PDF')
    const ocrPages = Math.min(pdf.numPages, Math.max(1, options.maxOcrPages ?? 3))
    const ocrText: string[] = []
    for (let pageNumber = 1; pageNumber <= ocrPages; pageNumber += 1) {
      options.onStatus?.(`OCR halaman ${pageNumber}/${ocrPages}`)
      const canvas = await renderPdfPageToCanvas(pdf, pageNumber)
      ocrText.push(await recognizeCanvas(canvas))
    }
    text = ocrText.join('\n\n').trim()
    source = text ? 'ocr' : 'filename'
  }

  options.onStatus?.('Mengekstrak metadata')
  const metadata = parseDocumentMetadata(text, title, source)
  const searchableText = text || fallbackSearchableText(title, metadata)

  return {
    pages: pdf.numPages,
    text: searchableText,
    metadata,
    category: inferCategory(metadata),
  }
}

async function extractFromImage(dataUrl: string, title: string, options: AutoFilingOptions) {
  options.onStatus?.('Menjalankan OCR pada gambar')
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  canvas.getContext('2d')?.drawImage(image, 0, 0)
  const text = (await recognizeCanvas(canvas)).trim()
  options.onStatus?.('Mengekstrak metadata')
  const metadata = parseDocumentMetadata(text, title, text ? 'ocr' : 'filename')

  return {
    pages: 1,
    text: text || fallbackSearchableText(title, metadata),
    metadata,
    category: inferCategory(metadata),
  }
}

async function renderPdfPageToCanvas(pdf: any, pageNumber: number) {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) return canvas
  await page.render({ canvasContext: context, viewport }).promise
  return canvas
}

async function recognizeCanvas(canvas: HTMLCanvasElement) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    workerPath: '/ocr/worker/worker.min.js',
    corePath: '/ocr/core/tesseract-core-lstm.wasm.js',
    langPath: '/ocr/tessdata/',
  })
  try {
    const result = await worker.recognize(canvas)
    return result.data.text || ''
  }
  finally {
    await worker.terminate()
  }
}

function normalizeText(value: string) {
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function stripExtension(value: string) {
  return value.replace(/\.[a-z0-9]+$/i, '').trim()
}

function cleanSegment(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72) || 'Untitled'
}

function extractCompany(value: string) {
  const labelled = value.match(/(?:nama\s+pt|company|perusahaan|dibayar\s+kepada|payee)\s*:?\s*(PT\.?\s+[A-Z0-9&.,' -]{2,80})/i)?.[1]
  const generic = value.match(/\b(PT\.?\s+[A-Z0-9&.,' -]{2,80})/i)?.[1]
  return cleanCompany(labelled || generic || '')
}

function cleanCompany(value: string) {
  return value
    .replace(/\s+(tanggal|date|voucher|invoice|nomor|no\.?|amount|jumlah|alamat|address).*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim()
}

function inferDocumentType(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes('voucher gj')) return 'Voucher GJ'
  if (lower.includes('vanpay')) return 'Voucher Vanpay'
  if (lower.includes('voucher')) return 'Voucher'
  if (lower.includes('invoice') || lower.includes('faktur')) return 'Invoice'
  if (lower.includes('agreement') || lower.includes('perjanjian')) return 'Agreement'
  if (lower.includes('npwp')) return 'NPWP'
  if (lower.includes('ktp')) return 'KTP'
  return ''
}

function extractDocumentNumber(value: string) {
  return value.match(/(?:no\.?\s*(?:voucher|dokumen|document|invoice|faktur)|voucher\s*no\.?|document\s*no\.?)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/._-]{2,})/i)?.[1]?.trim() ?? ''
}

function extractVoucherNumber(value: string) {
  return value.match(/(?:voucher)\s*(?:gj|vanpay)?\s*(?:no\.?)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/._-]{2,})/i)?.[1]?.trim() ?? ''
}

function inferNumberFromTitle(value: string) {
  const compact = value.replace(/\s*\(\d+\)\s*/g, '').replace(/\s+/g, '-').trim()
  return compact.length > 2 ? compact : ''
}

function inferYear(value: string) {
  return value.match(/\b(20\d{2})\b/)?.[1] ?? ''
}

function extractDate(value: string) {
  return value.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2})\b/)?.[1]
    || value.match(/\b(\d{1,2}\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*\s+20\d{2})\b/i)?.[1]
    || ''
}

function extractAmount(value: string) {
  return value.match(/\b(Rp\.?\s*[0-9][0-9.,]+)/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
}

function extractVendor(value: string) {
  return value.match(/(?:vendor|supplier|nama\s+vendor|penerima|payee)\s*:?\s*([A-Z0-9&.,' -]{3,80})/i)?.[1]
    ?.replace(/\s+(tanggal|date|invoice|voucher|amount|jumlah).*/i, '')
    .replace(/\s+/g, ' ')
    .trim() ?? ''
}

function fallbackSearchableText(title: string, metadata: DocumentMetadata) {
  return [
    `Dokumen upload ${title}.`,
    metadata.companyName ? `Nama PT ${metadata.companyName}.` : '',
    metadata.documentType ? `Tipe dokumen ${metadata.documentType}.` : '',
    metadata.voucherNumber || metadata.documentNumber ? `Nomor voucher atau dokumen ${metadata.voucherNumber || metadata.documentNumber}.` : '',
    metadata.documentYear ? `Tahun dokumen ${metadata.documentYear}.` : '',
  ].filter(Boolean).join(' ')
}
