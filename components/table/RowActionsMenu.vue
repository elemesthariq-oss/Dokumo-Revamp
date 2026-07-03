<script setup lang="ts">
import { Download, Edit3, ExternalLink, FolderInput, Share2, Tag, Trash2 } from 'lucide-vue-next'
import type { Category, Document } from '~/types'

const props = defineProps<{ document: Document }>()
const docs = useDocumentsStore()
const ui = useUiStore()
const open = ref(false)
const changingFolder = ref(false)
const changingCategory = ref(false)

function downloadDoc() {
  open.value = false
  ui.toast(`Mengunduh ${docs.downloadDocument(props.document.id)}`, 'success')
}

function removeDoc() {
  if (window.confirm('Hapus dokumen ini?')) {
    docs.removeDocument(props.document.id)
    ui.toast('Dokumen dihapus', 'success')
  }
  open.value = false
}

function changeFolder(folderId: string) {
  docs.moveToFolder(props.document.id, folderId)
  ui.toast('Dokumen dipindahkan folder', 'success')
  open.value = false
  changingFolder.value = false
}

function changeCategory(category: Category) {
  docs.setCategory(props.document.id, category)
  ui.toast('Kategori dokumen diganti', 'success')
  open.value = false
  changingCategory.value = false
}
</script>

<template>
  <div class="relative inline-flex">
    <button class="flex h-9 w-9 items-center justify-center rounded-[9px] text-ink3 hover:bg-surface2 hover:text-ink2" @click.stop="open = !open">
      <slot />
    </button>
    <div v-if="open" class="absolute right-0 top-10 z-20 w-56 rounded-card border border-border bg-surface p-2 shadow-sm">
      <NuxtLink :to="`/dokumen/ftp/${document.id}`" class="flex items-center gap-2 rounded-ctl px-3 py-2 text-[13px] text-ink2 hover:bg-surface2" @click="open = false"><ExternalLink :size="15" /> Buka</NuxtLink>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-ink2 hover:bg-surface2" @click="ui.openEditDocument(document.id); open = false"><Edit3 :size="15" /> Edit file</button>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-ink2 hover:bg-surface2" @click="downloadDoc"><Download :size="15" /> Unduh</button>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-ink2 hover:bg-surface2" @click="ui.openShare(document.id); open = false"><Share2 :size="15" /> Bagikan</button>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-ink2 hover:bg-surface2" @click="changingFolder = !changingFolder; changingCategory = false"><FolderInput :size="15" /> Pindah folder</button>
      <div v-if="changingFolder" class="mb-1 ml-5 max-h-52 space-y-1 overflow-y-auto">
        <button v-for="folder in docs.folders" :key="folder.id" class="block w-full rounded-lg px-2 py-1 text-left text-[12px] text-ink3 hover:bg-surface2" @click="changeFolder(folder.id)">{{ docs.folderPathLabel(folder.id) }}</button>
      </div>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-ink2 hover:bg-surface2" @click="changingCategory = !changingCategory; changingFolder = false"><Tag :size="15" /> Ganti kategori</button>
      <div v-if="changingCategory" class="mb-1 ml-5 space-y-1">
        <button v-for="category in docs.categories" :key="category" class="block w-full rounded-lg px-2 py-1 text-left text-[12px] text-ink3 hover:bg-surface2" @click="changeCategory(category)">{{ category }}</button>
      </div>
      <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-danger hover:bg-surface2" @click="removeDoc"><Trash2 :size="15" /> Hapus</button>
    </div>
  </div>
</template>
