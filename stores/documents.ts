import { defineStore } from 'pinia'
import { categories, documents, folders } from '~/data/seed'
import { buildAutoFolderSegments } from '~/composables/useDocumentAutoFiling'
import { clearDocumentFiles, deleteDocumentFile, saveDocumentFile } from '~/composables/useDocumentFileStorage'
import type { Category, Document, DocumentFilters, DocumentMetadata, DocumentPayload, DocumentView, Folder, FolderPayload, SortState } from '~/types'

const storageKey = 'dokumo-demo-state-v2'

const defaultFilters = (): DocumentFilters => ({
  categories: [],
  sources: [],
  from: '',
  to: '',
  folderId: '',
  quickAccess: '',
})

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    documents: structuredClone(documents) as Document[],
    folders: normalizeFolders(structuredClone(folders) as Folder[]),
    categories,
    filters: defaultFilters(),
    sort: { key: 'scannedAt', direction: 'desc' } as SortState,
    view: 'list' as DocumentView,
    syncLoading: false,
    lastHighlightedId: '',
    activeFolderId: '',
    hydrated: false,
  }),
  getters: {
    sources: (state) => [...new Set(state.documents.map((document) => document.source))],
    rootFolders: (state) => state.folders.filter((folder) => !folder.parentId),
    childFolders: (state) => (parentId?: string | null) => state.folders.filter((folder) => (folder.parentId ?? null) === (parentId || null)),
    descendantFolderIds: (state) => (id: string) => {
      const descendants: string[] = []
      const queue = state.folders.filter((folder) => folder.parentId === id).map((folder) => folder.id)
      while (queue.length) {
        const nextId = queue.shift()
        if (!nextId || descendants.includes(nextId)) continue
        descendants.push(nextId)
        queue.push(...state.folders.filter((folder) => folder.parentId === nextId).map((folder) => folder.id))
      }
      return descendants
    },
    folderPath: (state) => (id: string) => {
      const path: Folder[] = []
      const visited = new Set<string>()
      let cursor = state.folders.find((folder) => folder.id === id)
      while (cursor && !visited.has(cursor.id)) {
        visited.add(cursor.id)
        path.unshift(cursor)
        cursor = cursor.parentId ? state.folders.find((folder) => folder.id === cursor?.parentId) : undefined
      }
      return path
    },
    folderPathLabel() {
      return (id: string) => this.folderPath(id).map((folder) => folder.name).join(' / ')
    },
    documentsInFolder() {
      return (id: string, mode: 'direct' | 'recursive' = 'direct') => {
        const folderIds = mode === 'recursive' ? [id, ...this.descendantFolderIds(id)] : [id]
        return this.documents.filter((document) => folderIds.includes(document.folderId))
      }
    },
    folderCounts() {
      return this.folders.reduce<Record<string, number>>((acc, folder) => {
        const actual = this.documentsInFolder(folder.id, 'recursive').length
        acc[folder.id] = Math.max(folder.count, actual)
        return acc
      }, {})
    },
    filteredDocuments(state) {
      const filtered = state.documents.filter((document) => {
        const inCategory = !state.filters.categories.length || state.filters.categories.includes(document.category)
        const inSource = !state.filters.sources.length || state.filters.sources.includes(document.source)
        const folderIds = state.filters.folderId ? [state.filters.folderId, ...this.descendantFolderIds(state.filters.folderId)] : []
        const inFolder = !state.filters.folderId || folderIds.includes(document.folderId)
        const afterFrom = !state.filters.from || document.scannedAt.slice(0, 10) >= state.filters.from
        const beforeTo = !state.filters.to || document.scannedAt.slice(0, 10) <= state.filters.to
        const inQuick = !state.filters.quickAccess
          || document.category === state.filters.quickAccess
          || document.title.toLowerCase().includes(state.filters.quickAccess.toLowerCase())
          || document.content.toLowerCase().includes(state.filters.quickAccess.toLowerCase())
        return inCategory && inSource && inFolder && afterFrom && beforeTo && inQuick
      })

      return filtered.sort((a, b) => {
        const modifier = state.sort.direction === 'asc' ? 1 : -1
        const left = a[state.sort.key]
        const right = b[state.sort.key]
        return left > right ? modifier : left < right ? -modifier : 0
      })
    },
  },
  actions: {
    hydrate() {
      if (this.hydrated || !import.meta.client) return
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { documents?: Document[]; folders?: Folder[] }
          if (parsed.documents?.length) this.documents = parsed.documents
          if (parsed.folders?.length) this.folders = normalizeFolders(parsed.folders)
        }
        catch {
          window.localStorage.removeItem(storageKey)
        }
      }
      this.hydrated = true
      this.normalizeFolderTree()
      this.syncFolders()
      this.persist()
    },
    persist() {
      if (!import.meta.client) return
      const payload = JSON.stringify({
        documents: serializeDocuments(this.documents),
        folders: this.folders,
      })
      try {
        window.localStorage.setItem(storageKey, payload)
      }
      catch {
        window.localStorage.setItem(storageKey, JSON.stringify({
          documents: serializeDocuments(this.documents, true),
          folders: this.folders,
        }))
      }
    },
    resetDemoData() {
      this.documents = structuredClone(documents) as Document[]
      this.folders = normalizeFolders(structuredClone(folders) as Folder[])
      this.filters = defaultFilters()
      this.activeFolderId = ''
      this.lastHighlightedId = ''
      void clearDocumentFiles()
      this.persist()
    },
    async addDocument(payload: DocumentPayload) {
      const id = crypto.randomUUID()
      const fileStorageKey = payload.fileDataUrl ? `document-file:${id}` : undefined
      if (fileStorageKey) await saveDocumentFile(fileStorageKey, payload.fileDataUrl)
      const folderId = payload.folderId === 'auto' ? this.autoRouteDocument(payload) : payload.folderId
      const metadata = this.withFolderMetadata(payload.metadata, folderId)
      const generatedContent = this.generatedDocumentContent(payload.title, payload.category, folderId, metadata)
      const document: Document = {
        id,
        title: payload.title,
        content: payload.content?.trim() || generatedContent,
        pages: payload.pages ?? 1,
        source: payload.source ?? 'Upload Manual',
        category: payload.category,
        folderId,
        scannedAt: new Date().toISOString(),
        fileType: payload.fileType ?? 'application/pdf',
        fileSize: payload.fileSize ?? 0,
        fileStorageKey,
        metadata,
        sharedWith: [],
        highlighted: true,
      }
      this.documents.unshift(document)
      this.lastHighlightedId = document.id
      this.syncFolders()
      this.persist()
      return document.id
    },
    updateDocument(id: string, payload: Partial<DocumentPayload>) {
      const document = this.documents.find((item) => item.id === id)
      if (!document) return
      const nextCategory = payload.category ?? document.category
      const nextFolderId = payload.folderId === 'auto' ? this.autoRouteDocument({
        title: payload.title ?? document.title,
        category: nextCategory,
        folderId: 'auto',
        metadata: payload.metadata ?? document.metadata,
      }) : payload.folderId ?? document.folderId
      Object.assign(document, {
        ...payload,
        category: nextCategory,
        folderId: nextFolderId,
        metadata: this.withFolderMetadata(payload.metadata ?? document.metadata, nextFolderId),
      })
      this.lastHighlightedId = id
      this.syncFolders()
      this.persist()
    },
    generatedDocumentContent(title: string, category: Category, folderId: string, metadata?: DocumentMetadata) {
      const folder = this.folderPathLabel(folderId) || this.folders.find((item) => item.id === folderId)?.name || 'tujuan'
      return [
        `Dokumen unggahan baru ${title} kategori ${category}.`,
        metadata?.companyName ? `Nama PT ${metadata.companyName}.` : '',
        metadata?.documentType ? `Tipe dokumen ${metadata.documentType}.` : '',
        metadata?.voucherNumber || metadata?.documentNumber ? `Nomor voucher atau dokumen ${metadata.voucherNumber || metadata.documentNumber}.` : '',
        metadata?.documentYear ? `Tahun dokumen ${metadata.documentYear}.` : '',
        metadata?.amount ? `Nilai dokumen ${metadata.amount}.` : '',
        `Auto-routing menempatkan file ke folder ${folder}.`,
      ].filter(Boolean).join(' ')
    },
    withFolderMetadata(metadata: DocumentMetadata | undefined, folderId: string) {
      if (!metadata) return undefined
      return {
        ...metadata,
        folderPath: this.folderPathLabel(folderId),
      }
    },
    autoRouteDocument(payload: Pick<DocumentPayload, 'title' | 'category' | 'metadata'>) {
      if (payload.metadata) {
        return this.upsertFolderPath(buildAutoFolderSegments(payload.metadata, payload.title), payload.category)
      }
      return folderForCategory(payload.category)
    },
    rerouteDocumentByMetadata(id: string) {
      const document = this.documents.find((item) => item.id === id)
      if (!document?.metadata) return false
      const folderId = this.autoRouteDocument({
        title: document.title,
        category: document.category,
        metadata: document.metadata,
      })
      document.folderId = folderId
      document.metadata = this.withFolderMetadata(document.metadata, folderId)
      this.lastHighlightedId = id
      this.syncFolders()
      this.persist()
      return true
    },
    upsertFolderPath(segments: string[], category: Category) {
      let parentId: string | null = null
      let lastId = folderForCategory(category)
      for (const rawSegment of segments) {
        const name = rawSegment.trim()
        if (!name) continue
        const existing = this.folders.find((folder) => folder.name.toLowerCase() === name.toLowerCase() && (folder.parentId ?? null) === parentId)
        if (existing) {
          lastId = existing.id
          parentId = existing.id
          continue
        }
        lastId = this.createFolder({ name, category, parentId })
        parentId = lastId
      }
      return lastId
    },
    removeDocument(id: string) {
      const document = this.documents.find((item) => item.id === id)
      void deleteDocumentFile(document?.fileStorageKey)
      this.documents = this.documents.filter((document) => document.id !== id)
      this.syncFolders()
      this.persist()
    },
    moveToFolder(id: string, folderId: string) {
      const document = this.documents.find((item) => item.id === id)
      if (document) document.folderId = folderId
      this.syncFolders()
      this.persist()
    },
    setCategory(id: string, category: Category) {
      const document = this.documents.find((item) => item.id === id)
      if (document) document.category = category
      this.syncFolders()
      this.persist()
    },
    shareDocument(id: string, recipient: string) {
      const document = this.documents.find((item) => item.id === id)
      if (!document) return
      document.sharedWith = [...new Set([...(document.sharedWith ?? []), recipient])]
      document.sharedWithMe = true
      this.persist()
    },
    downloadDocument(id: string) {
      return this.documents.find((item) => item.id === id)?.title ?? ''
    },
    createFolder(payload: FolderPayload) {
      const id = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID()
      const uniqueId = this.folders.some((folder) => folder.id === id) ? `${id}-${Date.now()}` : id
      const parentId = payload.parentId && this.folders.some((folder) => folder.id === payload.parentId) ? payload.parentId : null
      this.folders.push({
        id: uniqueId,
        name: payload.name,
        category: payload.category,
        count: 0,
        parentId,
        description: payload.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      this.persist()
      return uniqueId
    },
    updateFolder(id: string, payload: Partial<FolderPayload>) {
      const folder = this.folders.find((item) => item.id === id)
      if (!folder) return
      const nextParentId = payload.parentId === undefined ? folder.parentId ?? null : payload.parentId || null
      if (nextParentId && (nextParentId === id || this.descendantFolderIds(id).includes(nextParentId))) return false
      if (nextParentId && !this.folders.some((item) => item.id === nextParentId)) return false
      Object.assign(folder, payload, { parentId: nextParentId, updatedAt: new Date().toISOString() })
      this.persist()
      return true
    },
    deleteFolder(id: string, targetFolderId?: string) {
      const documentsInFolder = this.documents.filter((document) => document.folderId === id)
      const childFolders = this.folders.filter((folder) => folder.parentId === id)
      const hasNestedContent = documentsInFolder.length > 0 || childFolders.length > 0
      const descendantIds = this.descendantFolderIds(id)
      const validTarget = targetFolderId
        && targetFolderId !== id
        && !descendantIds.includes(targetFolderId)
        && this.folders.some((folder) => folder.id === targetFolderId)
      if (hasNestedContent && !validTarget) return false
      if (documentsInFolder.length && validTarget) {
        for (const document of documentsInFolder) document.folderId = targetFolderId
      }
      if (childFolders.length && validTarget) {
        for (const folder of childFolders) folder.parentId = targetFolderId
      }
      if (!hasNestedContent || validTarget) {
        this.folders = this.folders.filter((folder) => folder.id !== id)
        if (this.filters.folderId === id) this.filters.folderId = ''
        if (this.activeFolderId === id) this.activeFolderId = ''
        this.syncFolders()
        this.persist()
        return true
      }
      return false
    },
    setActiveFolder(id: string) {
      this.activeFolderId = id
    },
    syncFolders() {
      this.folders = this.folders.map((folder) => {
        const actual = this.documentsInFolder(folder.id, 'recursive').length
        return { ...folder, count: Math.max(folder.count, actual) }
      })
      this.persist()
    },
    normalizeFolderTree() {
      this.folders = normalizeFolders(this.folders)
    },
    async runSync() {
      this.syncLoading = true
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      this.syncFolders()
      this.syncLoading = false
    },
    setSort(key: SortState['key']) {
      this.sort = {
        key,
        direction: this.sort.key === key && this.sort.direction === 'asc' ? 'desc' : 'asc',
      }
    },
    setView(view: DocumentView) {
      this.view = view
    },
    setFolderFilter(folderId: string) {
      this.filters.folderId = this.filters.folderId === folderId ? '' : folderId
      this.activeFolderId = this.filters.folderId
    },
    setQuickAccess(value: string) {
      this.filters.quickAccess = this.filters.quickAccess === value ? '' : value
    },
    clearFilters() {
      this.filters = defaultFilters()
    },
  },
})

function normalizeFolders(items: Folder[]) {
  const ids = new Set(items.map((folder) => folder.id))
  const normalized = items.map((folder) => ({
    ...folder,
    parentId: folder.parentId && ids.has(folder.parentId) ? folder.parentId : null,
  }))

  const descendantsOf = (id: string) => {
    const descendants: string[] = []
    const queue = normalized.filter((folder) => folder.parentId === id).map((folder) => folder.id)
    while (queue.length) {
      const next = queue.shift()
      if (!next || descendants.includes(next)) continue
      descendants.push(next)
      queue.push(...normalized.filter((folder) => folder.parentId === next).map((folder) => folder.id))
    }
    return descendants
  }

  return normalized.map((folder) => descendantsOf(folder.id).includes(folder.id) ? { ...folder, parentId: null } : folder)
}

function serializeDocuments(items: Document[], compact = false) {
  return items.map((document) => {
    const { fileDataUrl, ...safeDocument } = document
    if (!compact) return safeDocument
    return {
      ...safeDocument,
      content: safeDocument.content.slice(0, 30000),
      metadata: safeDocument.metadata
        ? {
            ...safeDocument.metadata,
            rawOcrText: safeDocument.metadata.rawOcrText?.slice(0, 12000),
          }
        : undefined,
    }
  })
}

function folderForCategory(category: Category) {
  const map: Record<Category, string> = {
    Administrasi: 'ktp',
    Legal: 'agreement',
    Payroll: 'employment',
    'Training & Sertifikasi': 'employment',
    Keuangan: 'invoice',
  }
  return map[category]
}
