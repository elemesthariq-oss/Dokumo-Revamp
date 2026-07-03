import type { Document, SearchFilters, SearchResult, SearchScope } from '~/types'

const synonymMap: Record<string, string[]> = {
  gaji: ['slip gaji', 'payroll', 'penghasilan', 'upah'],
  kontrak: ['perjanjian', 'agreement', 'pkwt', 'akad'],
  perjanjian: ['kontrak', 'agreement', 'akad'],
  pajak: ['pph', 'npwp', 'ppn'],
  kredit: ['pembiayaan', 'cicilan', 'angsuran', 'pinjaman'],
  kendaraan: ['mobil', 'motor', 'otomotif'],
  ktp: ['identitas', 'kependudukan'],
  karyawan: ['pegawai', 'employee', 'staff'],
  pelatihan: ['training', 'sertifikasi', 'sertifikat'],
  invoice: ['tagihan', 'faktur'],
  npwp: ['pajak', 'nomor pokok wajib pajak'],
  voucher: ['bukti bayar', 'payment', 'vanpay', 'gj'],
  dokumen: ['document', 'nomor dokumen'],
  pt: ['perusahaan', 'company'],
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s_/-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function expandTerms(query: string) {
  const normalizedQuery = normalize(query)
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  const terms = new Set<string>([normalizedQuery, ...tokens])
  for (const token of tokens) {
    for (const synonym of synonymMap[token] ?? []) {
      terms.add(synonym)
      for (const part of normalize(synonym).split(' ')) terms.add(part)
    }
  }
  return [...terms].filter((term) => term.length > 1)
}

function tokenCoverage(haystack: string, query: string) {
  const normalizedHaystack = normalize(haystack)
  const tokens = normalize(query).split(' ').filter((token) => token.length > 1)
  if (!tokens.length) return 0
  return tokens.filter((token) => normalizedHaystack.includes(token)).length / tokens.length
}

function includesTerm(haystack: string, term: string) {
  return normalize(haystack).includes(normalize(term))
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char)
}

function highlight(value: string, terms: string[]) {
  let html = escapeHtml(value)
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  for (const term of sorted) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!escaped) continue
    html = html.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-transparent font-semibold text-brandStrong">$1</mark>')
  }
  return html
}

function createSnippet(content: string, terms: string[]) {
  const normalizedContent = normalize(content)
  const hit = terms.find((term) => normalizedContent.includes(normalize(term)))
  if (!hit) return `${content.slice(0, 150)}${content.length > 150 ? '...' : ''}`
  const index = normalizedContent.indexOf(normalize(hit))
  const start = Math.max(0, index - 65)
  const end = Math.min(content.length, index + 110)
  return `${start > 0 ? '...' : ''}${content.slice(start, end)}${end < content.length ? '...' : ''}`
}

function passesFilters(document: Document, filters?: SearchFilters) {
  if (!filters) return true
  const inCategory = !filters.categories.length || filters.categories.includes(document.category)
  const inSource = !filters.sources.length || filters.sources.includes(document.source)
  const folderIds = filters.folderIds?.length ? filters.folderIds : filters.folderId ? [filters.folderId] : []
  const inFolder = !folderIds.length || folderIds.includes(document.folderId)
  const afterFrom = !filters.from || document.scannedAt.slice(0, 10) >= filters.from
  const beforeTo = !filters.to || document.scannedAt.slice(0, 10) <= filters.to
  return inCategory && inSource && inFolder && afterFrom && beforeTo
}

function metadataHaystack(document: Document) {
  const metadata = document.metadata
  if (!metadata) return ''
  return [
    metadata.companyName,
    metadata.documentType,
    metadata.documentNumber,
    metadata.voucherNumber,
    metadata.documentYear,
    metadata.documentDate,
    metadata.amount,
    metadata.vendorName,
    metadata.folderPath,
    metadata.rawOcrText,
  ].filter(Boolean).join(' ')
}

export function searchDocuments(documents: Document[], query: string, scope: SearchScope, filters?: SearchFilters): SearchResult[] {
  const terms = expandTerms(query)
  if (!terms.length) return []
  const normalizedQuery = normalize(query)

  return documents
    .filter((document) => passesFilters(document, filters))
    .map((document) => {
      const metadataText = metadataHaystack(document)
      const searchableContent = [document.content, metadataText].filter(Boolean).join('\n')
      const searchableTitle = [document.title, document.metadata?.companyName, document.metadata?.documentType, document.metadata?.voucherNumber, document.metadata?.documentNumber].filter(Boolean).join(' ')
      const titleMatches = terms.filter((term) => scope !== 'content' && includesTerm(searchableTitle, term))
      const contentMatches = terms.filter((term) => scope !== 'title' && includesTerm(searchableContent, term))
      const exactTitlePhrase = scope !== 'content' && normalizedQuery.length > 1 && includesTerm(searchableTitle, normalizedQuery)
      const exactContentPhrase = scope !== 'title' && normalizedQuery.length > 1 && includesTerm(searchableContent, normalizedQuery)
      const titleCoverage = scope !== 'content' ? tokenCoverage(searchableTitle, query) : 0
      const contentCoverage = scope !== 'title' ? tokenCoverage(searchableContent, query) : 0
      const uniqueMatches = new Set([...titleMatches, ...contentMatches])
      const score = Math.min(
        100,
        titleMatches.length * 24
        + contentMatches.length * 14
        + uniqueMatches.size * 4
        + (exactTitlePhrase ? 44 : 0)
        + (exactContentPhrase ? 52 : 0)
        + titleCoverage * 22
        + contentCoverage * 34,
      )
      const snippet = createSnippet(searchableContent, [normalizedQuery, ...contentMatches, ...titleMatches])

      return {
        document,
        score,
        snippet,
        titleHtml: highlight(document.title, terms),
        snippetHtml: highlight(snippet, terms),
        matchedTitle: titleMatches.length > 0,
        matchedContent: contentMatches.length > 0,
      }
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
}

// TODO produksi: ganti matching client-side ini dengan PostgreSQL tsvector/tsquery,
// Elasticsearch, atau embeddings + vector search terhadap title + OCR text.
