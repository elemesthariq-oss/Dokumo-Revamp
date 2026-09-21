<script setup lang="ts">
import {
  AlertCircle, ArrowLeftToLine, ArrowRightToLine, Bot, Check, ChevronDown, Clock3, FileScan, FileSearch,
  FileText, FolderClosed, GitCompareArrows, Layers, ListChecks, Loader2, Maximize2, MessageSquareText,
  Minimize2, Minus, MoreVertical, Paperclip, Pencil, Plus, Search, Send, Sparkles, Square, SquarePen,
  Trash2, X,
} from 'lucide-vue-next'
import AssistantResponse from '~/components/document/assistant/AssistantResponse.vue'
import type { DocScope } from '~/composables/useDocumentAssistant'

const route = useRoute()
const router = useRouter()
const docs = useDocumentsStore()
const assistant = useAssistantStore()

const messageList = ref<HTMLElement | null>(null)
const composer = ref<HTMLTextAreaElement | null>(null)
const scopeMenuOpen = ref(false)
const conversationMenuId = ref('')

/* ---- route document context ---- */
const routeDocumentId = computed(() => route.path.match(/^\/dokumen\/ftp\/([^/]+)$/)?.[1] || '')
const routeDocument = computed(() => docs.documents.find(document => document.id === routeDocumentId.value))
const dismissedContextId = ref('')
const contextDocument = computed(() => routeDocument.value?.id === dismissedContextId.value ? undefined : routeDocument.value)

/* ---- scope resolution ---- */
const scope = computed<DocScope>(() => assistant.activeConversation?.scope || { kind: 'all' })
const scopeDocuments = computed(() => assistant.resolveScopeDocuments(contextDocument.value))
const scopeLabel = computed(() => {
  switch (scope.value.kind) {
    case 'folder': return docs.folderPathLabel(scope.value.folderId || '') || 'Folder tertentu'
    case 'selected': return `${scope.value.documentIds?.length || 0} dokumen terpilih`
    case 'conversation': return 'Dokumen dalam percakapan ini'
    default: return 'Semua dokumen yang dapat diakses'
  }
})
const scopeCount = computed(() => scopeDocuments.value.length)

/* ---- panel state ---- */
const isOpen = computed(() => assistant.isOpen)
const isExpanded = computed(() => assistant.mode === 'expanded')
const isMinimized = computed(() => assistant.mode === 'minimized')

/* ---- dynamic suggested prompts (composer chips) ---- */
const quickStarters = [
  { label: 'Ringkas Dokumen', icon: FileText, prompt: 'Ringkas informasi penting dari dokumen yang relevan.' },
  { label: 'Ekstrak Data', icon: Layers, prompt: 'Ekstrak data faktur pajak menjadi tabel.' },
  { label: 'Bandingkan Dokumen', icon: GitCompareArrows, prompt: 'Bandingkan nilai invoice dengan purchase order.' },
  { label: 'Validasi Data', icon: ListChecks, prompt: 'Apakah nilai DPP, PPN, dan total invoice sudah sesuai?' },
  { label: 'Buat Laporan', icon: FileScan, prompt: 'Buat laporan rekonsiliasi dari dokumen-dokumen ini.' },
]

const composerSuggestions = computed(() => {
  const messages = assistant.messages
  const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant' && message.result)
  if (lastAssistant?.result?.suggestedNext.length) return lastAssistant.result.suggestedNext.slice(0, 4)

  // Context-aware defaults based on the active document / scope.
  const companyName = contextDocument.value?.metadata?.companyName
  const base: string[] = []
  if (contextDocument.value) {
    base.push('Ringkas dokumen yang sedang saya buka.')
    if (companyName) base.push(`Tampilkan seluruh dokumen dari ${companyName}.`)
    base.push('Validasi DPP, PPN, dan total pada dokumen ini.')
  }
  else {
    base.push('Tampilkan seluruh faktur pajak tahun 2025.')
    base.push('Ringkas seluruh invoice dari PT Hexindo.')
    base.push('Temukan invoice yang sudah melewati tanggal jatuh tempo.')
    base.push('Cari dokumen dengan nomor faktur yang sama.')
  }
  return base.slice(0, 4)
})

/* ---- lifecycle ---- */
onMounted(() => {
  assistant.hydrate()
})

watch(() => route.query.assistant, (value) => {
  if (value === 'open') {
    assistant.open('default')
    const query = { ...route.query }
    delete query.assistant
    void router.replace({ path: route.path, query })
  }
}, { immediate: true })

watch(routeDocumentId, (nextId, previousId) => {
  if (nextId !== previousId) dismissedContextId.value = ''
})

watch(() => [assistant.messages.length, assistant.isAnalyzing], async () => {
  await nextTick()
  messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })
})

/* ---- actions ---- */
function submit() {
  const text = assistant.draft
  if (!text.trim() || assistant.isAnalyzing) return
  void assistant.ask(text, contextDocument.value)
}

function runPrompt(text: string) {
  void assistant.ask(text, contextDocument.value)
}

function insertSuggestion(text: string) {
  // Populate the composer (editable), don't auto-send. No duplication.
  assistant.setDraft(text)
  nextTick(() => {
    composer.value?.focus()
    autoGrow()
  })
}

function autoGrow() {
  const element = composer.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 132)}px`
}

watch(() => assistant.draft, () => nextTick(autoGrow))

function onOpenSource(payload: { id: string; page?: number; anchor?: string }) {
  const query: Record<string, string> = { highlight: payload.id }
  if (payload.page) query.page = String(payload.page)
  if (payload.anchor) query.section = payload.anchor
  assistant.setMode('minimized')
  void router.push({ path: `/dokumen/ftp/${payload.id}`, query })
}

function setScope(kind: DocScope['kind'], extra: Partial<DocScope> = {}) {
  assistant.setScope({ kind, ...extra })
  scopeMenuOpen.value = false
}

function startNewConversation() {
  assistant.startConversation()
  assistant.setDraft('')
  conversationMenuId.value = ''
}

function confirmDelete(id: string) {
  assistant.deleteConversation(id)
  conversationMenuId.value = ''
}

const intentLabel: Record<string, string> = {
  search: 'Pencarian', extract: 'Ekstraksi', summary: 'Ringkasan', compare: 'Perbandingan',
  validate: 'Validasi', duplicate: 'Deteksi duplikat', calculate: 'Perhitungan', overdue: 'Jatuh tempo',
  report: 'Laporan', unclear: 'Klarifikasi',
}

function timeLabel(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function relativeUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date)
}

// Close popovers when clicking elsewhere.
function onGlobalClick() {
  scopeMenuOpen.value = false
  conversationMenuId.value = ''
}
</script>

<template>
  <Teleport to="body">
    <!-- dim overlay behind expanded panel (page stays visible underneath) -->
    <Transition name="assistant-overlay">
      <div
        v-if="isOpen && isExpanded && !isMinimized"
        class="fixed inset-0 z-[78] bg-[#1c1733]/35"
        aria-hidden="true"
        @click="assistant.setMode('default')"
      />
    </Transition>

    <div
      class="document-assistant fixed bottom-5 right-4 z-[80] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      @click="onGlobalClick"
    >
      <Transition name="assistant-panel">
        <section
          v-if="isOpen"
          class="pointer-events-auto flex flex-col overflow-hidden rounded-[18px] border border-borderStrong bg-surface shadow-[0_28px_80px_rgba(15,23,42,.28)]"
          :class="[
            isMinimized
              ? 'h-[58px] w-[min(420px,calc(100vw-24px))]'
              : isExpanded
                ? 'h-[min(88vh,calc(100vh-56px))] w-[min(76vw,1120px)] max-w-[calc(100vw-32px)]'
                : 'h-[min(78vh,720px)] w-[min(456px,calc(100vw-24px))]',
          ]"
          aria-label="Tanya Dokumen"
          @click.stop="onGlobalClick"
        >
          <!-- ============ HEADER ============ -->
          <header class="flex min-h-[56px] items-center gap-2.5 border-b border-border px-3.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brandTint text-brandStrong">
              <MessageSquareText :size="17" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-[13.5px] font-bold text-ink">Tanya Dokumen</h2>
                <span class="hidden rounded-full bg-brandTint px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brandStrong sm:inline">AI Analyst</span>
              </div>
              <p class="truncate text-[11px] text-ink3">
                {{ assistant.activeConversation?.title || 'Percakapan baru' }}
                <span v-if="!isMinimized"> • {{ scopeLabel }}</span>
              </p>
            </div>

            <button
              v-if="!isMinimized"
              class="assistant-icon-button"
              :aria-label="isExpanded ? 'Perkecil panel' : 'Perbesar panel'"
              :title="isExpanded ? 'Perkecil' : 'Perbesar'"
              @click.stop="assistant.setMode(isExpanded ? 'default' : 'expanded')"
            >
              <Minimize2 v-if="isExpanded" :size="16" />
              <Maximize2 v-else :size="16" />
            </button>
            <button
              class="assistant-icon-button"
              :aria-label="isMinimized ? 'Buka panel' : 'Minimize panel'"
              :title="isMinimized ? 'Buka' : 'Minimize'"
              @click.stop="assistant.setMode(isMinimized ? 'default' : 'minimized')"
            >
              <ChevronDown v-if="isMinimized" :size="16" />
              <Minus v-else :size="16" />
            </button>
            <button class="assistant-icon-button" aria-label="Tutup Tanya Dokumen" title="Tutup" @click.stop="assistant.close()">
              <X :size="16" />
            </button>
          </header>

          <div v-if="!isMinimized" class="flex min-h-0 flex-1">
            <!-- ============ SIDEBAR (expanded only) ============ -->
            <aside
              v-if="isExpanded && !assistant.sidebarCollapsed"
              class="flex w-[264px] shrink-0 flex-col border-r border-border bg-[#fbfcff]"
            >
              <div class="flex flex-col gap-2 border-b border-border p-3">
                <button
                  class="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand text-[12.5px] font-bold text-white transition hover:bg-brandStrong"
                  @click.stop="startNewConversation"
                >
                  <SquarePen :size="15" /> Percakapan Baru
                </button>
                <div class="relative">
                  <Search :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink3" />
                  <input
                    :value="assistant.conversationSearch"
                    type="search"
                    placeholder="Cari percakapan…"
                    class="h-8 w-full rounded-[9px] border border-borderStrong bg-surface pl-8 pr-2.5 text-[11.5px] text-ink placeholder:text-ink3 focus:border-brand focus:ring-2 focus:ring-brandTint2"
                    aria-label="Cari percakapan"
                    @input="assistant.conversationSearch = ($event.target as HTMLInputElement).value"
                  >
                </div>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2.5">
                <template v-if="assistant.conversationGroups.length">
                  <section v-for="group in assistant.conversationGroups" :key="group.key" class="mb-3 last:mb-0">
                    <h3 class="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink3">{{ group.label }}</h3>
                    <div class="space-y-0.5">
                      <div
                        v-for="conversation in group.items"
                        :key="conversation.id"
                        class="group/item relative flex items-center gap-1 rounded-[9px] pr-1 transition"
                        :class="conversation.id === assistant.activeId ? 'bg-brandTint' : 'hover:bg-surface2'"
                      >
                        <button class="min-w-0 flex-1 px-2 py-2 text-left" @click.stop="assistant.switchConversation(conversation.id)">
                          <span class="flex items-center gap-1.5">
                            <span
                              v-if="conversation.id === assistant.activeId"
                              class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                              aria-hidden="true"
                            />
                            <span
                              class="truncate text-[12px] font-semibold"
                              :class="conversation.id === assistant.activeId ? 'text-brandStrong' : 'text-ink2'"
                            >{{ conversation.title }}</span>
                          </span>
                          <span class="mt-0.5 flex items-center gap-1 pl-3 text-[10px] text-ink3">
                            <Clock3 :size="10" /> {{ relativeUpdated(conversation.updatedAt) }}
                            <span>• {{ conversation.messages.filter(message => message.role === 'assistant').reduce((total, message) => total + (message.count || 0), 0) }} dok.</span>
                          </span>
                        </button>
                        <button
                          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-ink3 opacity-0 transition hover:bg-surface hover:text-ink group-hover/item:opacity-100 focus-visible:opacity-100"
                          aria-label="Opsi percakapan"
                          @click.stop="conversationMenuId = conversationMenuId === conversation.id ? '' : conversation.id"
                        >
                          <MoreVertical :size="14" />
                        </button>
                        <div
                          v-if="conversationMenuId === conversation.id"
                          class="absolute right-1 top-9 z-20 w-40 overflow-hidden rounded-[10px] border border-border bg-surface py-1 shadow-modal"
                          @click.stop
                        >
                          <button
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink2 hover:bg-surface2"
                            @click.stop="(() => { const name = window.prompt('Ubah nama percakapan', conversation.title); if (name) assistant.renameConversation(conversation.id, name); conversationMenuId = '' })()"
                          >
                            <Pencil :size="13" /> Ubah nama
                          </button>
                          <button
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-danger hover:bg-red-50"
                            @click.stop="confirmDelete(conversation.id)"
                          >
                            <Trash2 :size="13" /> Hapus percakapan
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </template>
                <div v-else class="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <MessageSquareText :size="20" class="text-ink3" />
                  <p class="mt-2 text-[11.5px] font-semibold text-ink2">Belum ada percakapan</p>
                  <p class="text-[10.5px] text-ink3">Mulai dengan pertanyaan pertama Anda.</p>
                </div>
              </div>
            </aside>

            <!-- ============ MAIN CONVERSATION AREA ============ -->
            <div class="flex min-w-0 flex-1 flex-col bg-[#fbfcff]">
              <!-- sticky context bar -->
              <div class="flex items-center gap-2 border-b border-border bg-surface px-3.5 py-2">
                <button
                  v-if="isExpanded"
                  class="assistant-icon-button !h-7 !w-7"
                  :aria-label="assistant.sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'"
                  :title="assistant.sidebarCollapsed ? 'Tampilkan riwayat' : 'Sembunyikan riwayat'"
                  @click.stop="assistant.toggleSidebar()"
                >
                  <ArrowRightToLine v-if="assistant.sidebarCollapsed" :size="15" />
                  <ArrowLeftToLine v-else :size="15" />
                </button>

                <div class="relative min-w-0 flex-1">
                  <button
                    class="flex w-full items-center gap-2 rounded-[9px] border border-border bg-surface2 px-2.5 py-1.5 text-left transition hover:border-brandTint2"
                    @click.stop="scopeMenuOpen = !scopeMenuOpen"
                  >
                    <FileSearch :size="14" class="shrink-0 text-brandStrong" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[11.5px] font-semibold text-ink">{{ scopeLabel }}</span>
                      <span class="block text-[10px] text-ink3">{{ scopeCount }} dokumen termasuk</span>
                    </span>
                    <ChevronDown :size="14" class="shrink-0 text-ink3" />
                  </button>
                  <div
                    v-if="scopeMenuOpen"
                    class="absolute left-0 top-full z-20 mt-1 w-full max-w-[320px] overflow-hidden rounded-[10px] border border-border bg-surface py-1 shadow-modal"
                    @click.stop
                  >
                    <button class="assistant-scope-item" @click="setScope('all')">
                      <Layers :size="14" /> Semua dokumen yang dapat diakses
                      <Check v-if="scope.kind === 'all'" :size="14" class="ml-auto text-brand" />
                    </button>
                    <button
                      v-for="folder in docs.rootFolders"
                      :key="folder.id"
                      class="assistant-scope-item"
                      @click="setScope('folder', { folderId: folder.id })"
                    >
                      <FolderClosed :size="14" /> {{ folder.name }}
                      <Check v-if="scope.kind === 'folder' && scope.folderId === folder.id" :size="14" class="ml-auto text-brand" />
                    </button>
                    <button
                      v-if="contextDocument"
                      class="assistant-scope-item"
                      @click="setScope('selected', { documentIds: [contextDocument!.id] })"
                    >
                      <FileText :size="14" /> Dokumen terpilih (aktif)
                      <Check v-if="scope.kind === 'selected'" :size="14" class="ml-auto text-brand" />
                    </button>
                    <button class="assistant-scope-item" @click="setScope('conversation')">
                      <MessageSquareText :size="14" /> Dokumen dalam percakapan ini
                      <Check v-if="scope.kind === 'conversation'" :size="14" class="ml-auto text-brand" />
                    </button>
                  </div>
                </div>

                <div
                  v-if="contextDocument"
                  class="hidden items-center gap-1 rounded-full bg-brandTint px-2 py-1 text-[10.5px] font-semibold text-brandStrong sm:flex"
                >
                  <FileText :size="12" />
                  <span class="max-w-[120px] truncate">{{ contextDocument.title }}</span>
                  <button aria-label="Lepas dokumen aktif" @click.stop="dismissedContextId = contextDocument.id">
                    <X :size="12" />
                  </button>
                </div>
              </div>

              <!-- messages -->
              <div ref="messageList" class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4" aria-live="polite">
                <!-- EMPTY STATE -->
                <div v-if="!assistant.messages.length" class="mx-auto flex min-h-full max-w-[560px] flex-col">
                  <div class="mt-2 flex flex-col items-center text-center">
                    <div class="flex h-12 w-12 items-center justify-center rounded-[14px] border border-brandTint2 bg-brandTint text-brandStrong">
                      <Bot :size="23" />
                    </div>
                    <h3 class="mt-3 text-[15px] font-bold text-ink">Tanyakan apa pun tentang dokumen Anda</h3>
                    <p class="mt-1 max-w-[380px] text-[12px] leading-[18px] text-ink2">
                      Cari informasi, buat ringkasan, ekstrak data, bandingkan dokumen, atau temukan ketidaksesuaian.
                    </p>
                  </div>

                  <div class="mt-5 grid grid-cols-2 gap-2" :class="isExpanded ? 'sm:grid-cols-3' : ''">
                    <button
                      v-for="starter in quickStarters"
                      :key="starter.label"
                      class="flex items-center gap-2.5 rounded-[11px] border border-border bg-surface px-3 py-2.5 text-left transition hover:border-brandTint2 hover:bg-brandTint"
                      @click.stop="runPrompt(starter.prompt)"
                    >
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-brandTint text-brandStrong">
                        <component :is="starter.icon" :size="16" />
                      </span>
                      <span class="min-w-0">
                        <span class="block text-[12px] font-bold text-ink">{{ starter.label }}</span>
                      </span>
                    </button>
                  </div>
                </div>

                <!-- CONVERSATION -->
                <div v-else class="mx-auto flex max-w-[760px] flex-col gap-3">
                  <template v-for="message in assistant.messages" :key="message.id">
                    <!-- user bubble (right, compact purple) -->
                    <div v-if="message.role === 'user'" :id="`assistant-message-${message.id}`" class="flex flex-col items-end">
                      <div class="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-brand px-3.5 py-2 text-[12.5px] leading-[19px] text-white">
                        {{ message.text }}
                      </div>
                      <span class="mt-1 pr-1 text-[10px] text-ink3">{{ timeLabel(message.createdAt) }}</span>
                    </div>

                    <!-- assistant response (left, neutral container) -->
                    <div v-else :id="`assistant-message-${message.id}`" class="flex items-start gap-2">
                      <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-brandTint text-brandStrong">
                        <Bot :size="15" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="rounded-[14px] rounded-tl-[4px] border border-border bg-surface px-3.5 py-3 shadow-sm">
                          <!-- structured result -->
                          <AssistantResponse
                            v-if="message.result"
                            :result="message.result"
                            :compact="!isExpanded"
                            @open-source="onOpenSource"
                            @suggest="insertSuggestion"
                            @expand="assistant.setMode('expanded')"
                          />

                          <!-- state-only messages -->
                          <template v-else>
                            <div v-if="message.state === 'unclear'" class="flex items-start gap-2 text-[12.5px] leading-[19px] text-ink2">
                              <AlertCircle :size="16" class="mt-0.5 shrink-0 text-amber-500" />
                              <span>{{ message.text }}</span>
                            </div>
                            <div v-else-if="message.state === 'empty'" class="text-[12.5px] leading-[19px] text-ink2">
                              <p class="flex items-center gap-1.5 font-semibold text-ink"><Search :size="15" class="text-ink3" /> Tidak ada dokumen yang cocok</p>
                              <p class="mt-1">{{ message.text }}</p>
                            </div>
                            <div v-else-if="message.state === 'no-active-document'" class="text-[12.5px] leading-[19px] text-ink2">
                              <p class="flex items-center gap-1.5 font-semibold text-ink"><FileText :size="15" class="text-ink3" /> Tidak ada dokumen aktif</p>
                              <p class="mt-1">{{ message.text }}</p>
                            </div>
                            <p v-else>{{ message.text }}</p>
                          </template>
                        </div>
                        <span class="mt-1 flex items-center gap-1.5 pl-1 text-[10px] text-ink3">
                          <Check :size="11" class="text-emerald-500" /> {{ timeLabel(message.createdAt) }}
                          <span v-if="message.intent && intentLabel[message.intent]">• {{ intentLabel[message.intent] }}</span>
                        </span>
                      </div>
                    </div>
                  </template>

                  <!-- LOADING / STREAMING -->
                  <div v-if="assistant.isAnalyzing" class="flex items-start gap-2">
                    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-brandTint text-brandStrong">
                      <Bot :size="15" />
                    </span>
                    <div class="rounded-[14px] rounded-tl-[4px] border border-border bg-surface px-3.5 py-3 shadow-sm">
                      <div class="flex items-center gap-2 text-[12px] text-ink2">
                        <Loader2 :size="15" class="animate-spin text-brand" />
                        <span>Membaca &amp; menganalisis dokumen</span>
                        <span class="assistant-dots"><span /><span /><span /></span>
                      </div>
                    </div>
                  </div>

                  <!-- ERROR -->
                  <div v-if="assistant.error" class="flex items-start gap-2">
                    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-red-50 text-danger">
                      <AlertCircle :size="15" />
                    </span>
                    <div class="rounded-[14px] rounded-tl-[4px] border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] leading-[18px] text-red-700">
                      {{ assistant.error }}
                      <button class="ml-1 font-bold underline" @click.stop="assistant.retryLast()">Coba lagi</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ============ COMPOSER ============ -->
              <div class="border-t border-border bg-surface px-3.5 pb-3 pt-2.5">
                <!-- dynamic suggested prompts (horizontally scrollable chips) -->
                <div v-if="composerSuggestions.length" class="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    v-for="prompt in composerSuggestions"
                    :key="prompt"
                    class="inline-flex shrink-0 items-center gap-1 rounded-full border border-borderStrong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink2 transition hover:border-brandTint2 hover:bg-brandTint hover:text-brandStrong"
                    @click.stop="insertSuggestion(prompt)"
                  >
                    <Sparkles :size="11" class="text-brand" /> <span class="whitespace-nowrap">{{ prompt }}</span>
                  </button>
                </div>

                <div class="rounded-[13px] border border-borderStrong bg-surface px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brandTint2">
                  <textarea
                    ref="composer"
                    :value="assistant.draft"
                    rows="1"
                    class="block max-h-[132px] min-h-[24px] w-full resize-none border-0 bg-transparent text-[12.5px] leading-[20px] text-ink placeholder:text-[#7a8194] focus:shadow-none focus:outline-none"
                    placeholder="Tanyakan, bandingkan, atau analisis informasi dari dokumen…"
                    aria-label="Pertanyaan untuk Tanya Dokumen"
                    @input="assistant.setDraft(($event.target as HTMLTextAreaElement).value)"
                    @keydown.enter.exact.prevent="submit()"
                  />
                  <div class="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex h-7 items-center gap-1 rounded-[8px] border border-border px-2 text-[11px] font-semibold text-ink2 transition hover:border-brandTint2 hover:text-brandStrong"
                      title="Ubah dokumen yang dianalisis"
                      @click.stop="scopeMenuOpen = !scopeMenuOpen"
                    >
                      <Plus :size="13" /> Dokumen
                    </button>
                    <button
                      type="button"
                      class="assistant-icon-button !h-7 !w-7"
                      title="Lampirkan berkas (segera hadir)"
                      aria-label="Lampirkan berkas"
                      disabled
                    >
                      <Paperclip :size="14" />
                    </button>

                    <span class="ml-auto text-[10px] text-ink3">Enter kirim • Shift+Enter baris baru</span>

                    <button
                      v-if="assistant.isAnalyzing"
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-borderStrong text-ink2 transition hover:bg-surface2"
                      title="Hentikan"
                      aria-label="Hentikan analisis"
                      @click.stop="assistant.isAnalyzing = false"
                    >
                      <Square :size="14" />
                    </button>
                    <button
                      v-else
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand text-white transition hover:bg-brandStrong disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="!assistant.draft.trim()"
                      aria-label="Kirim pertanyaan"
                      @click.stop="submit()"
                    >
                      <Send :size="15" />
                    </button>
                  </div>
                </div>
                <p class="mt-1.5 text-[10px] leading-[14px] text-ink3">
                  AI hanya menggunakan dokumen yang dapat Anda akses dan menyertakan sumber pada setiap jawaban.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Transition>

      <!-- ============ COLLAPSED FAB ============ -->
      <button
        v-if="!isOpen"
        class="assistant-trigger group relative flex h-14 items-center gap-2.5 rounded-full bg-brand px-4 text-white shadow-[0_10px_28px_rgba(91,76,224,.34)] transition hover:-translate-y-0.5 hover:bg-brandStrong"
        aria-label="Buka Tanya Dokumen"
        @click.stop="assistant.open('default')"
      >
        <Bot :size="20" />
        <span class="hidden text-[13px] font-bold sm:inline">Tanya Dokumen</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.assistant-icon-button {
  display: inline-flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: var(--ink-2);
  transition: background-color 180ms ease, color 180ms ease;
}
.assistant-icon-button:hover {
  background: var(--surface-2);
  color: var(--ink);
}
.assistant-icon-button:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.assistant-scope-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  color: var(--ink-2);
}
.assistant-scope-item:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.assistant-dots {
  display: inline-flex;
  gap: 3px;
}
.assistant-dots span {
  height: 4px;
  width: 4px;
  border-radius: 9999px;
  background: var(--brand);
  animation: assistant-bounce 1.1s infinite ease-in-out;
}
.assistant-dots span:nth-child(2) { animation-delay: .15s; }
.assistant-dots span:nth-child(3) { animation-delay: .3s; }

@keyframes assistant-bounce {
  0%, 80%, 100% { opacity: .3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: opacity 200ms ease, transform 260ms cubic-bezier(.22, 1, .36, 1);
  transform-origin: bottom right;
}
.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(.98);
}

.assistant-overlay-enter-active,
.assistant-overlay-leave-active {
  transition: opacity 200ms ease;
}
.assistant-overlay-enter-from,
.assistant-overlay-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .assistant-panel-enter-active,
  .assistant-panel-leave-active,
  .assistant-overlay-enter-active,
  .assistant-overlay-leave-active,
  .assistant-trigger,
  .assistant-dots span {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
