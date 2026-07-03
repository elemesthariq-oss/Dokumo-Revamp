export type Category = 'Administrasi' | 'Legal' | 'Payroll' | 'Training & Sertifikasi' | 'Keuangan'
export type Role = 'Admin' | 'Staff' | 'Viewer'
export type SearchScope = 'both' | 'title' | 'content'
export type DocumentView = 'list' | 'grid'

export interface DocumentMetadata {
  companyName?: string
  documentType?: string
  documentNumber?: string
  voucherNumber?: string
  documentYear?: string
  documentDate?: string
  amount?: string
  vendorName?: string
  confidence?: number
  extractionSource?: 'pdf-text' | 'ocr' | 'manual' | 'filename'
  rawOcrText?: string
  folderPath?: string
  needsReview?: boolean
}

export interface Document {
  id: string
  title: string
  content: string
  pages: number
  source: string
  category: Category
  folderId: string
  scannedAt: string
  fileType?: string
  fileSize?: number
  fileDataUrl?: string
  fileStorageKey?: string
  metadata?: DocumentMetadata
  sharedWith?: string[]
  sharedWithMe?: boolean
  highlighted?: boolean
}

export interface Folder {
  id: string
  name: string
  category: Category
  count: number
  parentId?: string | null
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  name: string
  role: Role
  initials: string
}

export interface SortState {
  key: 'pages' | 'category' | 'scannedAt'
  direction: 'asc' | 'desc'
}

export interface DocumentFilters {
  categories: Category[]
  sources: string[]
  from: string
  to: string
  folderId: string
  quickAccess: string
}

export interface Toast {
  id: string
  type: 'success' | 'info' | 'error'
  message: string
}

export interface SearchResult {
  document: Document
  score: number
  snippet: string
  titleHtml: string
  snippetHtml: string
  matchedTitle: boolean
  matchedContent: boolean
}

export interface DocumentPayload {
  title: string
  content?: string
  pages?: number
  source?: string
  category: Category
  folderId: string
  fileType?: string
  fileSize?: number
  fileDataUrl?: string
  fileStorageKey?: string
  metadata?: DocumentMetadata
}

export interface FolderPayload {
  name: string
  category: Category
  parentId?: string | null
  description?: string
}

export interface SearchFilters {
  categories: Category[]
  sources: string[]
  folderId: string
  folderIds?: string[]
  from: string
  to: string
}
