import { defineStore } from 'pinia'
import {
  type AssistantMessage,
  analyzeDocumentQuestion,
  createAssistantId,
} from '~/composables/useDocumentAssistant'
import { useDocumentsStore } from '~/stores/documents'
import type { Document } from '~/types'

export type PanelMode = 'default' | 'expanded' | 'minimized'
export type ScopeKind = 'all' | 'folder' | 'selected' | 'conversation'

export interface DocScope {
  kind: ScopeKind
  folderId?: string
  documentIds?: string[]
}

export interface Conversation {
  id: string
  title: string
  messages: AssistantMessage[]
  scope: DocScope
  createdAt: string
  updatedAt: string
}

const storageKey = 'dokumo-assistant-conversations-v1'
const legacyKey = 'dokumo-document-assistant-history-v1'
const maxConversations = 40
const maxMessagesPerConversation = 120

function defaultScope(): DocScope {
  return { kind: 'all' }
}

function titleFromText(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > 46 ? `${clean.slice(0, 46)}…` : clean || 'Percakapan baru'
}

function newConversation(scope: DocScope = defaultScope()): Conversation {
  const now = new Date().toISOString()
  return {
    id: createAssistantId(),
    title: 'Percakapan baru',
    messages: [],
    scope,
    createdAt: now,
    updatedAt: now,
  }
}

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    conversations: [] as Conversation[],
    activeId: '',
    isOpen: false,
    mode: 'default' as PanelMode,
    sidebarCollapsed: false,
    isAnalyzing: false,
    error: '',
    failedQuestion: '',
    draft: '',
    conversationSearch: '',
    hydrated: false,
  }),
  getters: {
    activeConversation(state): Conversation | undefined {
      return state.conversations.find(conversation => conversation.id === state.activeId)
    },
    messages(): AssistantMessage[] {
      return this.activeConversation?.messages ?? []
    },
    promptCount(): number {
      return this.messages.filter(message => message.role === 'user').length
    },
    lastSourceIds(): string[] {
      return [...this.messages].reverse().find(message => message.role === 'assistant' && message.sourceIds)?.sourceIds || []
    },
    /** conversations grouped by local date, newest first */
    conversationGroups(state) {
      const query = state.conversationSearch.trim().toLowerCase()
      const filtered = state.conversations
        .filter(conversation => !query || conversation.title.toLowerCase().includes(query)
          || conversation.messages.some(message => message.text.toLowerCase().includes(query)))
        .slice()
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

      const grouped = new Map<string, Conversation[]>()
      for (const conversation of filtered) {
        const key = localDateKey(conversation.updatedAt)
        grouped.set(key, [...(grouped.get(key) || []), conversation])
      }
      return [...grouped.entries()].map(([key, items]) => ({ key, label: dateLabel(key), items }))
    },
  },
  actions: {
    hydrate() {
      if (this.hydrated || !import.meta.client) return
      this.hydrated = true

      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { conversations?: Conversation[]; activeId?: string }
          if (Array.isArray(parsed.conversations) && parsed.conversations.length) {
            this.conversations = parsed.conversations.slice(-maxConversations)
            this.activeId = parsed.activeId && this.conversations.some(c => c.id === parsed.activeId)
              ? parsed.activeId
              : this.conversations[0].id
            return
          }
        }
        catch {
          window.localStorage.removeItem(storageKey)
        }
      }

      // Migrate legacy flat history into a single conversation.
      const legacy = window.localStorage.getItem(legacyKey)
      if (legacy) {
        try {
          const parsedMessages = JSON.parse(legacy) as AssistantMessage[]
          if (Array.isArray(parsedMessages) && parsedMessages.length) {
            const conversation = newConversation()
            conversation.messages = parsedMessages
              .filter(message => message && (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string')
              .map(message => ({ ...message, id: message.id || createAssistantId() }))
              .slice(-maxMessagesPerConversation)
            const firstUser = conversation.messages.find(message => message.role === 'user')
            if (firstUser) conversation.title = titleFromText(firstUser.text)
            this.conversations = [conversation]
            this.activeId = conversation.id
            this.persist()
            return
          }
        }
        catch {
          window.localStorage.removeItem(legacyKey)
        }
      }

      this.startConversation()
    },
    persist() {
      if (!import.meta.client) return
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          conversations: this.conversations.slice(-maxConversations),
          activeId: this.activeId,
        }))
      }
      catch {
        // Keep session state even if storage is full.
      }
    },
    ensureConversation() {
      if (!this.activeConversation) this.startConversation()
    },
    startConversation(scope?: DocScope) {
      const conversation = newConversation(scope || this.activeConversation?.scope || defaultScope())
      this.conversations.unshift(conversation)
      if (this.conversations.length > maxConversations) this.conversations = this.conversations.slice(0, maxConversations)
      this.activeId = conversation.id
      this.error = ''
      this.failedQuestion = ''
      this.persist()
      return conversation.id
    },
    switchConversation(id: string) {
      if (this.conversations.some(conversation => conversation.id === id)) {
        this.activeId = id
        this.error = ''
        this.persist()
      }
    },
    renameConversation(id: string, title: string) {
      const conversation = this.conversations.find(item => item.id === id)
      if (!conversation) return
      conversation.title = title.trim() || conversation.title
      conversation.updatedAt = new Date().toISOString()
      this.persist()
    },
    deleteConversation(id: string) {
      this.conversations = this.conversations.filter(conversation => conversation.id !== id)
      if (this.activeId === id) {
        this.activeId = this.conversations[0]?.id || ''
        if (!this.activeId) this.startConversation()
      }
      this.persist()
    },
    setScope(scope: DocScope) {
      this.ensureConversation()
      const conversation = this.activeConversation
      if (!conversation) return
      conversation.scope = scope
      conversation.updatedAt = new Date().toISOString()
      this.persist()
    },
    setDraft(value: string) {
      this.draft = value
    },
    open(mode: PanelMode = 'default') {
      this.ensureConversation()
      this.isOpen = true
      this.mode = mode === 'minimized' ? 'default' : mode
    },
    close() {
      this.isOpen = false
    },
    setMode(mode: PanelMode) {
      this.mode = mode
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    /** Resolve the documents included in the active scope, given a route context doc. */
    resolveScopeDocuments(contextDocument?: Document): Document[] {
      const docs = useDocumentsStore()
      const conversation = this.activeConversation
      const scope = conversation?.scope || defaultScope()

      if (scope.kind === 'folder' && scope.folderId) {
        const ids = [scope.folderId, ...docs.descendantFolderIds(scope.folderId)]
        return docs.documents.filter(document => ids.includes(document.folderId))
      }
      if (scope.kind === 'selected' && scope.documentIds?.length) {
        return docs.documents.filter(document => scope.documentIds!.includes(document.id))
      }
      if (scope.kind === 'conversation') {
        const ids = new Set(conversation?.messages.flatMap(message => message.sourceIds || []) || [])
        if (contextDocument) ids.add(contextDocument.id)
        const scoped = docs.documents.filter(document => ids.has(document.id))
        return scoped.length ? scoped : docs.documents
      }
      return docs.documents
    },
    async ask(rawText: string, contextDocument?: Document) {
      const text = rawText.trim()
      if (!text || this.isAnalyzing) return
      this.ensureConversation()
      const conversation = this.activeConversation
      if (!conversation) return

      const now = new Date().toISOString()
      conversation.messages.push({ id: createAssistantId(), role: 'user', text, createdAt: now })
      if (conversation.messages.filter(message => message.role === 'user').length === 1) {
        conversation.title = titleFromText(text)
      }
      conversation.updatedAt = now
      this.draft = ''
      this.error = ''
      this.failedQuestion = ''
      this.isAnalyzing = true
      this.persist()

      try {
        await new Promise(resolve => window.setTimeout(resolve, 780))
        const scopeDocuments = this.resolveScopeDocuments(contextDocument)
        const message = analyzeDocumentQuestion(scopeDocuments, text, {
          contextDocument: conversation.scope.kind === 'all' ? contextDocument : undefined,
          previousSourceIds: this.lastSourceIds,
        })
        conversation.messages.push(message)
        if (conversation.messages.length > maxMessagesPerConversation) {
          conversation.messages = conversation.messages.slice(-maxMessagesPerConversation)
        }
        conversation.updatedAt = new Date().toISOString()
        this.persist()
      }
      catch {
        this.failedQuestion = text
        this.error = 'Analisis dokumen gagal. Silakan coba lagi tanpa menghapus percakapan ini.'
      }
      finally {
        this.isAnalyzing = false
      }
    },
    retryLast() {
      if (this.failedQuestion) void this.ask(this.failedQuestion)
    },
  },
})

function localDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'legacy'
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateLabel(key: string) {
  if (key === 'legacy') return 'Sebelumnya'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (key === localDateKey(today.toISOString())) return 'Hari ini'
  if (key === localDateKey(yesterday.toISOString())) return 'Kemarin'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${key}T00:00:00`))
}
