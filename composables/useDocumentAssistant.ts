import type { Document } from '~/types'
import { searchDocuments } from '~/composables/useSmartSearch'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type AssistantIntent =
  | 'search'
  | 'summary'
  | 'extract'
  | 'compare'
  | 'validate'
  | 'duplicate'
  | 'calculate'
  | 'overdue'
  | 'report'
  | 'unclear'

export type FindingStatus = 'sesuai' | 'perlu-diperiksa' | 'tidak-sesuai' | 'tidak-tersedia'

export type AssistantState =
  | 'success'
  | 'empty'
  | 'missing-data'
  | 'unclear'
  | 'no-active-document'

export interface AssistantSource {
  id: string
  title: string
  page?: number
  section?: string
  anchor?: string
}

export interface AssistantResultRow {
  id: string
  company: string
  documentType: string
  documentNumber: string
  date: string
  taxBase: string
  vat: string
  total: string
  status: string
  source: string
  title: string
}

export interface SummaryCard {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger'
}

export interface KeyValueItem {
  label: string
  value: string
  status?: FindingStatus
}

export interface ComparisonRow {
  label: string
  values: string[]
  status: FindingStatus
}

export interface ComparisonBlock {
  columns: string[]
  rows: ComparisonRow[]
}

export interface ValidationItem {
  label: string
  detail: string
  status: FindingStatus
}

export interface TimelineItem {
  date: string
  title: string
  detail: string
  tone?: 'default' | 'warning' | 'danger'
}

export interface CalculationLine {
  label: string
  value: string
  emphasis?: boolean
}

export interface Finding {
  status: FindingStatus
  text: string
}

export interface AssistantResult {
  understanding: string
  keySummary: string
  table?: { title: string; rows: AssistantResultRow[] }
  summaryCards?: SummaryCard[]
  keyValues?: { title: string; items: KeyValueItem[] }
  comparison?: { title: string; block: ComparisonBlock }
  validation?: { title: string; items: ValidationItem[] }
  timeline?: { title: string; items: TimelineItem[] }
  calculation?: { title: string; lines: CalculationLine[] }
  findings?: Finding[]
  sources: AssistantSource[]
  suggestedNext: string[]
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt?: string
  intent?: AssistantIntent
  state?: AssistantState
  count?: number
  sourceIds?: string[]
  result?: AssistantResult
  /** legacy field kept for backward compatibility with older stored history */
  rows?: AssistantResultRow[]
}

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                           */
/* -------------------------------------------------------------------------- */

export function createAssistantId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function parseCurrency(value = '') {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function formatRupiah(value: number) {
  return `Rp${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function searchableText(document: Document) {
  return [
    document.title,
    document.content,
    document.category,
    document.source,
    document.metadata?.companyName,
    document.metadata?.vendorName,
    document.metadata?.documentType,
    document.metadata?.documentNumber,
    document.metadata?.voucherNumber,
    document.metadata?.poNumber,
    document.metadata?.documentYear,
    document.metadata?.documentDate,
  ].filter(Boolean).join(' ').toLowerCase()
}

function statusLabel(document: Document) {
  const status = document.metadata?.paymentStatus
  if (status === 'lunas') return 'Lunas'
  if (status === 'jatuh-tempo') return 'Jatuh tempo'
  if (status === 'belum-dibayar') return 'Belum dibayar'
  return '-'
}

function firstSection(document: Document) {
  return document.metadata?.sections?.[0]
}

function sectionForTopic(document: Document, topic: 'pajak' | 'identitas' | 'termin' | 'default' = 'default') {
  const sections = document.metadata?.sections
  if (!sections?.length) return undefined
  if (topic === 'pajak') return sections.find(section => /pajak|tagihan|rincian/i.test(section.label)) || sections[sections.length - 1]
  if (topic === 'termin') return sections.find(section => /termin|jatuh|bayar/i.test(section.label)) || sections[sections.length - 1]
  if (topic === 'identitas') return sections.find(section => /identitas/i.test(section.label)) || sections[0]
  return sections[0]
}

function toSource(document: Document, topic: 'pajak' | 'identitas' | 'termin' | 'default' = 'default'): AssistantSource {
  const section = sectionForTopic(document, topic) || firstSection(document)
  return {
    id: document.id,
    title: document.title,
    page: section?.page,
    section: section?.label,
    anchor: section?.anchor,
  }
}

function toRow(document: Document): AssistantResultRow {
  const metadata = document.metadata
  return {
    id: document.id,
    company: metadata?.companyName || metadata?.vendorName || '-',
    documentType: metadata?.documentType || document.category,
    documentNumber: metadata?.documentNumber || metadata?.voucherNumber || '-',
    date: metadata?.documentDate || formatScanDate(document.scannedAt),
    taxBase: metadata?.taxBase || '-',
    vat: metadata?.vat || '-',
    total: metadata?.totalAmount || metadata?.amount || '-',
    status: statusLabel(document),
    source: document.source || '-',
    title: document.title,
  }
}

/* -------------------------------------------------------------------------- */
/*  Question parsing                                                          */
/* -------------------------------------------------------------------------- */

function thresholdFromQuestion(question: string) {
  const match = question.toLowerCase().match(/(?:rp\s*([\d.,]+)\s*(juta|miliar|ribu)?|([\d.,]+)\s*(juta|miliar|ribu))/)
  if (!match) return null
  const rawNumber = match[1] || match[3]
  const unit = match[2] || match[4]
  const numeric = Number(rawNumber.replace(/\./g, '').replace(',', '.'))
  const multiplier = unit === 'miliar' ? 1_000_000_000 : unit === 'juta' ? 1_000_000 : unit === 'ribu' ? 1_000 : 1
  return Number.isFinite(numeric) ? numeric * multiplier : null
}

export function classifyIntent(question: string): AssistantIntent {
  const q = question.toLowerCase()
  if (/rekonsiliasi|buat laporan|susun laporan|laporan .*(dokumen|invoice|faktur)/.test(q)) return 'report'
  if (/duplikat|duplicate|nomor.*sama|nominal.*sama|ganda/.test(q)) return 'duplicate'
  if (/jatuh tempo|melewati.*tempo|overdue|terlambat|telat bayar/.test(q)) return 'overdue'
  if (/bandingkan|banding|dibanding|vs\b|versus|selisih|beda(?!rah)|cocok(?:kah)?|sesuai(?:kah)?.*(po|purchase|invoice)/.test(q)) return 'compare'
  if (/valid(asi)?|apakah.*(dpp|ppn|total).*(sesuai|benar)|konsisten|cek.*(dpp|ppn|nilai)/.test(q)) return 'validate'
  if (/hitung|jumlah(kan)?|total (dari|seluruh|semua)|berapa total|akumulasi/.test(q)) return 'calculate'
  if (/ringkas|rangkuman|ringkasan|summar/.test(q)) return 'summary'
  if (/ekstrak|extract|tarik data|ambil data|tabelkan/.test(q)) return 'extract'
  if (/tampilkan|cari|temukan|daftar|list|semua|seluruh|berapa nominal|siapa|kapan/.test(q)) return 'search'
  // Too short / vague
  if (q.trim().split(/\s+/).length <= 2) return 'unclear'
  return 'search'
}

/* -------------------------------------------------------------------------- */
/*  Filtering (reused by search/extract/report)                               */
/* -------------------------------------------------------------------------- */

function filterDocuments(documents: Document[], question: string) {
  const normalized = question.toLowerCase()
  let results = [...documents]
  let hasStructuredFilter = false

  if (/faktur\s*pajak/.test(normalized)) {
    hasStructuredFilter = true
    results = results.filter(document => /faktur\s*pajak/.test(searchableText(document)) || document.metadata?.documentType === 'Faktur Pajak')
  }
  else if (/purchase order|\bpo\b/.test(normalized)) {
    hasStructuredFilter = true
    results = results.filter(document => document.metadata?.documentType === 'Purchase Order')
  }
  else if (/invoice|tagihan/.test(normalized)) {
    hasStructuredFilter = true
    results = results.filter(document => /invoice|tagihan|faktur/.test(searchableText(document)))
  }
  else if (/voucher|bukti bayar/.test(normalized)) {
    hasStructuredFilter = true
    results = results.filter(document => /voucher|bukti bayar|payment/.test(searchableText(document)))
  }
  else if (/transaksi/.test(normalized)) {
    hasStructuredFilter = true
    results = results.filter(document => document.category === 'Keuangan')
  }

  const year = normalized.match(/\b(20\d{2})\b/)?.[1]
  if (year) {
    hasStructuredFilter = true
    results = results.filter(document => document.metadata?.documentYear === year || searchableText(document).includes(year))
  }

  const namedParty = results
    .map(document => document.metadata?.vendorName || document.metadata?.companyName)
    .filter((value): value is string => Boolean(value))
    .find(value => normalized.includes(value.toLowerCase()) || normalized.includes(value.toLowerCase().replace(/^pt\s+/, '')))
  if (namedParty) {
    hasStructuredFilter = true
    results = results.filter(document => searchableText(document).includes(namedParty.toLowerCase()))
  }
  else {
    const explicitCompany = normalized.match(/\bpt\s+[a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*){0,3}/)?.[0]
    if (explicitCompany) {
      hasStructuredFilter = true
      results = results.filter(document => searchableText(document).includes(explicitCompany))
    }
  }

  const threshold = thresholdFromQuestion(normalized)
  if (threshold && /(di atas|lebih dari|di bawah|kurang dari)/.test(normalized)) {
    hasStructuredFilter = true
    const useVat = /ppn|vat/.test(normalized)
    const getValue = (document: Document) => parseCurrency(useVat ? document.metadata?.vat : document.metadata?.totalAmount || document.metadata?.amount)
    if (/di atas|lebih dari/.test(normalized)) results = results.filter(document => getValue(document) > threshold)
    if (/di bawah|kurang dari/.test(normalized)) results = results.filter(document => getValue(document) < threshold)
  }

  const documentNumber = normalized.match(/\b(?:0\d{2}[.\d-]+|[a-z]{2,}-?\d{3,}|\d{5,})\b/i)?.[0]
  if (documentNumber) {
    const exact = results.filter(document => searchableText(document).includes(documentNumber.toLowerCase()))
    if (exact.length) results = exact
  }

  if (!hasStructuredFilter && documents.length > 1 && !/semua|seluruh dokumen/.test(normalized)) {
    return searchDocuments(documents, question, 'both').map(result => result.document)
  }

  return results
}

function sumField(documents: Document[], field: 'taxBase' | 'vat' | 'total') {
  return documents.reduce((total, document) => {
    const raw = field === 'total'
      ? document.metadata?.totalAmount || document.metadata?.amount
      : field === 'vat'
        ? document.metadata?.vat
        : document.metadata?.taxBase
    return total + parseCurrency(raw)
  }, 0)
}

/* -------------------------------------------------------------------------- */
/*  Result builders per intent                                                */
/* -------------------------------------------------------------------------- */

function buildSummaryCards(documents: Document[]): SummaryCard[] {
  const total = sumField(documents, 'total')
  const overdue = documents.filter(document => document.metadata?.paymentStatus === 'jatuh-tempo').length
  return [
    { label: 'Dokumen dianalisis', value: `${documents.length}`, tone: 'brand' },
    { label: 'Total nilai', value: formatRupiah(total), hint: 'Akumulasi kolom Total', tone: 'default' },
    { label: 'Total PPN', value: formatRupiah(sumField(documents, 'vat')), tone: 'default' },
    ...(overdue ? [{ label: 'Jatuh tempo', value: `${overdue} dokumen`, tone: 'danger' as const }] : []),
  ]
}

function buildSearchResult(documents: Document[], question: string, scopeNote: string): AssistantResult {
  const withMeta = documents.filter(document => document.metadata)
  const tableDocs = withMeta.length ? withMeta : documents
  return {
    understanding: `Menampilkan dokumen yang cocok dengan "${question.trim()}"${scopeNote}.`,
    keySummary: `Ditemukan ${documents.length} dokumen yang relevan. Field yang tidak tersedia ditandai dengan “-”.`,
    summaryCards: withMeta.length ? buildSummaryCards(withMeta) : undefined,
    table: { title: 'Hasil ekstraksi', rows: tableDocs.map(toRow) },
    sources: documents.map(document => toSource(document)),
    suggestedNext: buildSuggestedNext('search', documents, question),
  }
}

function buildSummaryResult(documents: Document[], question: string, contextDocument?: Document): AssistantResult {
  const target = contextDocument || documents[0]
  const points = target.content
    .split(/(?<=\.)\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .slice(0, 4)
  return {
    understanding: contextDocument
      ? `Merangkum isi dokumen aktif "${target.title}".`
      : `Merangkum ${documents.length} dokumen yang relevan dengan permintaan Anda.`,
    keySummary: `Ringkasan disusun hanya dari isi dokumen sumber tanpa menambahkan data di luar dokumen.`,
    findings: points.map(point => ({ status: 'sesuai' as FindingStatus, text: point })),
    keyValues: target.metadata
      ? {
          title: 'Data utama',
          items: [
            { label: 'Perusahaan', value: target.metadata.companyName || '-' },
            { label: 'Jenis dokumen', value: target.metadata.documentType || target.category },
            { label: 'Nomor', value: target.metadata.documentNumber || '-' },
            { label: 'Tanggal', value: target.metadata.documentDate || '-' },
            { label: 'Total', value: target.metadata.totalAmount || target.metadata.amount || '-' },
          ],
        }
      : undefined,
    sources: documents.slice(0, 5).map(document => toSource(document)),
    suggestedNext: buildSuggestedNext('summary', documents, question),
  }
}

function buildCalculationResult(documents: Document[], question: string): AssistantResult {
  const withMeta = documents.filter(document => document.metadata)
  const dpp = sumField(withMeta, 'taxBase')
  const vat = sumField(withMeta, 'vat')
  const total = sumField(withMeta, 'total')
  return {
    understanding: `Menghitung akumulasi nilai dari ${withMeta.length} dokumen keuangan yang relevan.`,
    keySummary: `Total nilai ${formatRupiah(total)} dari ${withMeta.length} dokumen (DPP ${formatRupiah(dpp)} + PPN ${formatRupiah(vat)}).`,
    calculation: {
      title: 'Rincian perhitungan',
      lines: [
        { label: `Total DPP (${withMeta.length} dok.)`, value: formatRupiah(dpp) },
        { label: 'Total PPN', value: formatRupiah(vat) },
        { label: 'Total keseluruhan', value: formatRupiah(total), emphasis: true },
      ],
    },
    table: { title: 'Dokumen yang dihitung', rows: withMeta.map(toRow) },
    sources: withMeta.map(document => toSource(document, 'pajak')),
    suggestedNext: buildSuggestedNext('calculate', withMeta, question),
  }
}

function buildValidationResult(documents: Document[], question: string): AssistantResult {
  const targets = documents.filter(document => document.metadata?.taxBase && document.metadata?.vat)
  const items: ValidationItem[] = targets.map((document) => {
    const dpp = parseCurrency(document.metadata?.taxBase)
    const vat = parseCurrency(document.metadata?.vat)
    const total = parseCurrency(document.metadata?.totalAmount || document.metadata?.amount)
    const expectedVat = Math.round(dpp * 0.11)
    const vatOk = Math.abs(vat - expectedVat) <= 1000
    const totalOk = Math.abs(total - (dpp + vat)) <= 1000
    const status: FindingStatus = vatOk && totalOk ? 'sesuai' : 'tidak-sesuai'
    const detail = vatOk && totalOk
      ? `DPP ${formatRupiah(dpp)}, PPN ${formatRupiah(vat)} (11%), total ${formatRupiah(total)} konsisten.`
      : !vatOk
          ? `PPN tertera ${formatRupiah(vat)}, seharusnya ${formatRupiah(expectedVat)} (11% dari DPP ${formatRupiah(dpp)}).`
          : `Total tertera ${formatRupiah(total)}, seharusnya ${formatRupiah(dpp + vat)}.`
    return { label: `${document.metadata?.companyName} • ${document.metadata?.documentNumber}`, detail, status }
  })
  const mismatches = items.filter(item => item.status === 'tidak-sesuai').length
  return {
    understanding: `Memeriksa konsistensi DPP, PPN (11%), dan total pada ${targets.length} dokumen.`,
    keySummary: mismatches
      ? `${mismatches} dari ${targets.length} dokumen tidak konsisten dan perlu diperiksa.`
      : `Seluruh ${targets.length} dokumen konsisten antara DPP, PPN, dan total.`,
    validation: { title: 'Hasil validasi', items },
    findings: items
      .filter(item => item.status === 'tidak-sesuai')
      .map(item => ({ status: 'tidak-sesuai' as FindingStatus, text: `${item.label}: ${item.detail}` })),
    sources: targets.map(document => toSource(document, 'pajak')),
    suggestedNext: buildSuggestedNext('validate', targets, question),
  }
}

function buildCompareResult(documents: Document[], question: string): AssistantResult {
  // Prefer a document that declares a related counterpart.
  const anchor = documents.find(document => document.metadata?.relatedDocumentId)
    || documents.find(document => document.metadata?.documentType === 'Invoice')
    || documents[0]
  const relatedId = anchor?.metadata?.relatedDocumentId
  const counterpart = relatedId
    ? documents.find(document => document.id === relatedId)
    : documents.find(document => document.id !== anchor?.id && document.metadata?.companyName === anchor?.metadata?.companyName)

  if (!anchor || !counterpart) {
    return {
      understanding: `Membandingkan dokumen yang relevan dengan "${question.trim()}".`,
      keySummary: 'Tidak cukup dokumen berpasangan untuk dibandingkan. Pilih minimal dua dokumen terkait.',
      findings: [{ status: 'tidak-tersedia', text: 'Dokumen pembanding tidak ditemukan pada scope saat ini.' }],
      sources: documents.map(document => toSource(document)),
      suggestedNext: buildSuggestedNext('compare', documents, question),
    }
  }

  const pair = [anchor, counterpart]
  const columns = pair.map(document => document.metadata?.documentType || document.category)
  const fieldRow = (label: string, getter: (d: Document) => string): ComparisonRow => {
    const values = pair.map(getter)
    const status: FindingStatus = values[0] === values[1] ? 'sesuai' : 'tidak-sesuai'
    return { label, values, status }
  }
  const rows: ComparisonRow[] = [
    fieldRow('Perusahaan', d => d.metadata?.companyName || '-'),
    fieldRow('Nomor', d => d.metadata?.documentNumber || '-'),
    fieldRow('DPP', d => d.metadata?.taxBase || '-'),
    fieldRow('PPN', d => d.metadata?.vat || '-'),
    fieldRow('Total', d => d.metadata?.totalAmount || d.metadata?.amount || '-'),
  ]
  const mismatches = rows.filter(row => row.status === 'tidak-sesuai')
  return {
    understanding: `Membandingkan ${columns[0]} dengan ${columns[1]} dari ${anchor.metadata?.companyName}.`,
    keySummary: mismatches.length
      ? `${mismatches.length} field berbeda antara kedua dokumen: ${mismatches.map(row => row.label).join(', ')}.`
      : 'Seluruh field yang dibandingkan cocok antara kedua dokumen.',
    comparison: { title: 'Perbandingan dokumen', block: { columns, rows } },
    findings: mismatches.map(row => ({
      status: 'tidak-sesuai' as FindingStatus,
      text: `${row.label}: ${row.values[0]} vs ${row.values[1]}.`,
    })),
    sources: pair.map(document => toSource(document, 'pajak')),
    suggestedNext: buildSuggestedNext('compare', pair, question),
  }
}

function buildDuplicateResult(documents: Document[], question: string): AssistantResult {
  const byNumber = new Map<string, Document[]>()
  for (const document of documents) {
    const number = document.metadata?.documentNumber
    if (!number) continue
    byNumber.set(number, [...(byNumber.get(number) || []), document])
  }
  const duplicateGroups = [...byNumber.entries()].filter(([, group]) => group.length > 1)
  const duplicateDocs = duplicateGroups.flatMap(([, group]) => group)
  return {
    understanding: `Mendeteksi dokumen dengan nomor faktur/dokumen yang sama pada ${documents.length} dokumen.`,
    keySummary: duplicateGroups.length
      ? `Ditemukan ${duplicateGroups.length} grup dokumen berpotensi duplikat.`
      : 'Tidak ditemukan dokumen dengan nomor yang sama.',
    findings: duplicateGroups.map(([number, group]) => ({
      status: 'perlu-diperiksa' as FindingStatus,
      text: `Nomor ${number} muncul pada ${group.length} dokumen: ${group.map(d => d.title).join(', ')}.`,
    })),
    table: duplicateDocs.length ? { title: 'Dokumen berpotensi duplikat', rows: duplicateDocs.map(toRow) } : undefined,
    sources: duplicateDocs.map(document => toSource(document)),
    suggestedNext: buildSuggestedNext('duplicate', duplicateDocs.length ? duplicateDocs : documents, question),
  }
}

function parseDueDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildOverdueResult(documents: Document[], question: string): AssistantResult {
  const now = new Date()
  const withDue = documents.filter(document => document.metadata?.dueDate)
  const overdue = withDue.filter((document) => {
    const due = parseDueDate(document.metadata?.dueDate)
    const paid = document.metadata?.paymentStatus === 'lunas'
    return due ? due < now && !paid : false
  })
  const timelineItems: TimelineItem[] = withDue
    .slice()
    .sort((a, b) => (parseDueDate(a.metadata?.dueDate)?.getTime() || 0) - (parseDueDate(b.metadata?.dueDate)?.getTime() || 0))
    .map((document) => {
      const due = parseDueDate(document.metadata?.dueDate)
      const isOverdue = overdue.includes(document)
      return {
        date: due ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(due) : '-',
        title: `${document.metadata?.companyName} • ${document.metadata?.documentNumber}`,
        detail: isOverdue ? 'Sudah melewati jatuh tempo dan belum dibayar.' : `Status: ${statusLabel(document)}.`,
        tone: isOverdue ? 'danger' as const : 'default' as const,
      }
    })
  return {
    understanding: `Mengecek tanggal jatuh tempo pada ${withDue.length} dokumen keuangan.`,
    keySummary: overdue.length
      ? `${overdue.length} dokumen sudah melewati jatuh tempo dan belum dibayar.`
      : 'Tidak ada dokumen yang melewati jatuh tempo.',
    timeline: { title: 'Linimasa jatuh tempo', items: timelineItems },
    table: overdue.length ? { title: 'Dokumen jatuh tempo', rows: overdue.map(toRow) } : undefined,
    findings: overdue.map(document => ({
      status: 'tidak-sesuai' as FindingStatus,
      text: `${document.metadata?.companyName} (${document.metadata?.documentNumber}) jatuh tempo ${document.metadata?.dueDate}.`,
    })),
    sources: (overdue.length ? overdue : withDue).map(document => toSource(document, 'termin')),
    suggestedNext: buildSuggestedNext('overdue', overdue.length ? overdue : withDue, question),
  }
}

function buildReportResult(documents: Document[], question: string): AssistantResult {
  const withMeta = documents.filter(document => document.metadata)
  const overdue = withMeta.filter(document => document.metadata?.paymentStatus === 'jatuh-tempo')
  const needsReview = withMeta.filter(document => document.metadata?.needsReview)
  const numbers = new Map<string, number>()
  withMeta.forEach((document) => {
    const number = document.metadata?.documentNumber
    if (number) numbers.set(number, (numbers.get(number) || 0) + 1)
  })
  const duplicates = [...numbers.entries()].filter(([, count]) => count > 1)
  return {
    understanding: `Menyusun laporan rekonsiliasi dari ${withMeta.length} dokumen keuangan pada scope ini.`,
    keySummary: `Total nilai ${formatRupiah(sumField(withMeta, 'total'))}. ${overdue.length} jatuh tempo, ${duplicates.length} potensi duplikat, ${needsReview.length} perlu ditinjau.`,
    summaryCards: buildSummaryCards(withMeta),
    calculation: {
      title: 'Rekap nilai',
      lines: [
        { label: 'Total DPP', value: formatRupiah(sumField(withMeta, 'taxBase')) },
        { label: 'Total PPN', value: formatRupiah(sumField(withMeta, 'vat')) },
        { label: 'Total keseluruhan', value: formatRupiah(sumField(withMeta, 'total')), emphasis: true },
      ],
    },
    table: { title: 'Rincian dokumen', rows: withMeta.map(toRow) },
    findings: [
      ...duplicates.map(([number, count]) => ({ status: 'perlu-diperiksa' as FindingStatus, text: `Nomor ${number} muncul ${count}×, periksa kemungkinan duplikat.` })),
      ...overdue.map(document => ({ status: 'tidak-sesuai' as FindingStatus, text: `${document.metadata?.companyName} jatuh tempo (${document.metadata?.dueDate}).` })),
      ...needsReview.map(document => ({ status: 'perlu-diperiksa' as FindingStatus, text: `${document.title} ditandai perlu ditinjau (confidence ${document.metadata?.confidence}%).` })),
    ],
    sources: withMeta.map(document => toSource(document, 'pajak')),
    suggestedNext: buildSuggestedNext('report', withMeta, question),
  }
}

/* -------------------------------------------------------------------------- */
/*  Dynamic suggested next actions                                            */
/* -------------------------------------------------------------------------- */

export function buildSuggestedNext(intent: AssistantIntent, documents: Document[], _question: string): string[] {
  const company = documents.find(document => document.metadata?.companyName)?.metadata?.companyName
  const pool: string[] = []

  switch (intent) {
    case 'search':
    case 'extract':
      pool.push('Hitung total nilai dari dokumen ini.')
      if (company) pool.push(`Ringkas seluruh dokumen dari ${company}.`)
      pool.push('Validasi DPP, PPN, dan total pada hasil ini.')
      pool.push('Ekspor hasil ini ke Excel.')
      break
    case 'summary':
      pool.push('Ekstrak data penting menjadi tabel.')
      if (company) pool.push(`Bandingkan dokumen ${company} dengan pasangannya.`)
      pool.push('Apakah ada data yang perlu diperiksa?')
      break
    case 'validate':
      pool.push('Tampilkan hanya dokumen yang tidak sesuai.')
      pool.push('Bandingkan invoice dengan faktur pajaknya.')
      pool.push('Buat laporan rekonsiliasi dari dokumen ini.')
      break
    case 'compare':
      pool.push('Validasi konsistensi DPP, PPN, dan total.')
      pool.push('Cari dokumen lain dari perusahaan yang sama.')
      pool.push('Buat laporan rekonsiliasi.')
      break
    case 'duplicate':
      pool.push('Bandingkan dokumen duplikat tersebut secara berdampingan.')
      pool.push('Validasi nilai pada dokumen duplikat.')
      break
    case 'overdue':
      pool.push('Hitung total nilai dokumen yang jatuh tempo.')
      pool.push('Buat laporan tagihan jatuh tempo.')
      break
    case 'calculate':
      pool.push('Pisahkan total per perusahaan.')
      pool.push('Validasi konsistensi PPN pada dokumen ini.')
      break
    case 'report':
      pool.push('Ekspor laporan ke Excel.')
      pool.push('Tampilkan hanya temuan yang perlu diperiksa.')
      break
    default:
      pool.push('Tampilkan seluruh faktur pajak tahun 2025.')
      pool.push('Ringkas seluruh invoice dari PT Hexindo.')
  }

  return [...new Set(pool)].slice(0, 4)
}

/* -------------------------------------------------------------------------- */
/*  Main entry point                                                          */
/* -------------------------------------------------------------------------- */

export interface AnalyzeOptions {
  contextDocument?: Document
  previousSourceIds?: string[]
  intentOverride?: AssistantIntent
}

export function analyzeDocumentQuestion(
  allDocuments: Document[],
  question: string,
  options: AnalyzeOptions = {},
): AssistantMessage {
  const { contextDocument, previousSourceIds = [], intentOverride } = options
  const normalized = question.toLowerCase()
  const id = createAssistantId()
  const createdAt = new Date().toISOString()

  const isFollowUp = previousSourceIds.length > 0 && /^(yang|dari (hasil|dokumen)|filter|hanya|nominal|ppn|tampilkan hanya)|\bsaja\b|tersebut|itu|ini/.test(normalized)
  const previousDocuments = isFollowUp ? allDocuments.filter(document => previousSourceIds.includes(document.id)) : []
  const scope = contextDocument
    ? [contextDocument]
    : previousDocuments.length
      ? previousDocuments
      : allDocuments
  const scopeNote = isFollowUp ? ' dari hasil sebelumnya' : contextDocument ? ' pada dokumen aktif' : ''

  const intent = intentOverride || classifyIntent(question)

  // Unclear / ambiguous question.
  if (intent === 'unclear') {
    return {
      id,
      role: 'assistant',
      createdAt,
      intent: 'unclear',
      state: 'unclear',
      text: 'Pertanyaan Anda masih terlalu umum. Bisa Anda perjelas dokumen, periode, atau data yang ingin dianalisis?',
      count: 0,
      sourceIds: [],
    }
  }

  // Asking about an active doc but none is open.
  if (!contextDocument && /dokumen (ini|yang sedang (saya )?buka)|file ini/.test(normalized)) {
    return {
      id,
      role: 'assistant',
      createdAt,
      intent,
      state: 'no-active-document',
      text: 'Tidak ada dokumen aktif. Buka salah satu dokumen sumber atau ubah scope ke seluruh dokumen.',
      count: 0,
      sourceIds: [],
    }
  }

  // Determine the working document set for the intent.
  const financeScope = scope.filter(document => document.category === 'Keuangan' || document.metadata)
  let workingSet = filterDocuments(scope, question)

  // For analytical intents, prefer finance docs with metadata within the working set.
  if (['validate', 'calculate', 'compare', 'duplicate', 'overdue', 'report'].includes(intent)) {
    const metaSet = workingSet.filter(document => document.metadata)
    workingSet = metaSet.length ? metaSet : financeScope
  }

  if (!workingSet.length) {
    return {
      id,
      role: 'assistant',
      createdAt,
      intent,
      state: 'empty',
      text: 'Saya tidak menemukan dokumen yang memenuhi kriteria tersebut. Coba ubah nama pihak, rentang tahun, atau batas nominal. Data yang tidak tersedia tidak akan saya perkirakan.',
      count: 0,
      sourceIds: [],
    }
  }

  let result: AssistantResult
  switch (intent) {
    case 'summary':
      result = buildSummaryResult(workingSet, question, contextDocument)
      break
    case 'calculate':
      result = buildCalculationResult(workingSet, question)
      break
    case 'validate':
      result = buildValidationResult(workingSet, question)
      break
    case 'compare':
      result = buildCompareResult(workingSet, question)
      break
    case 'duplicate':
      result = buildDuplicateResult(workingSet, question)
      break
    case 'overdue':
      result = buildOverdueResult(workingSet, question)
      break
    case 'report':
      result = buildReportResult(workingSet, question)
      break
    case 'extract':
    case 'search':
    default:
      result = buildSearchResult(workingSet, question, scopeNote)
      break
  }

  const missingData = !result.sources.length
    && !result.table?.rows.length
    && !result.findings?.length

  return {
    id,
    role: 'assistant',
    createdAt,
    intent,
    state: missingData ? 'missing-data' : 'success',
    text: result.keySummary,
    count: result.table?.rows.length ?? workingSet.length,
    sourceIds: workingSet.map(document => document.id),
    result,
    rows: result.table?.rows,
  }
}
