<script setup lang="ts">
import { FolderPlus, Pencil, Trash2 } from 'lucide-vue-next'
import type { Folder } from '~/types'

const docs = useDocumentsStore()
const ui = useUiStore()

const folderTree = computed(() => {
  const rows: Array<{ folder: Folder; depth: number }> = []
  const walk = (parentId: string | null, depth: number) => {
    docs.childFolders(parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((folder) => {
        rows.push({ folder, depth })
        walk(folder.id, depth + 1)
      })
  }
  walk(null, 0)
  return rows
})

function createSubfolder(parentId: string) {
  ui.openFolderModal('', parentId)
}

function removeFolder(id: string) {
  const folderDocs = docs.documentsInFolder(id, 'direct')
  const childFolders = docs.childFolders(id)
  const descendants = docs.descendantFolderIds(id)
  const targetOptions = docs.folders.filter((folder) => folder.id !== id && !descendants.includes(folder.id))
  let target = ''
  if (folderDocs.length || childFolders.length) {
    target = window.prompt('Folder berisi file/subfolder. Masukkan ID folder tujuan pemindahan sebelum hapus:', targetOptions[0]?.id ?? '') ?? ''
    if (!target || !targetOptions.some((folder) => folder.id === target)) {
      ui.toast('Hapus folder dibatalkan: folder tujuan tidak valid', 'error')
      return
    }
  }
  if (window.confirm('Hapus folder ini?')) {
    const deleted = docs.deleteFolder(id, target)
    if (!deleted) {
      ui.toast('Folder gagal dihapus', 'error')
      return
    }
    ui.toast('Folder dihapus', 'success')
  }
}
</script>

<template>
  <PageShell title="Semua Folder" subtitle="Seluruh folder auto-routing yang tersedia di Dokumo.">
    <div class="mb-4 flex justify-end">
      <AppButton variant="primary" @click="ui.openFolderModal()"><FolderPlus :size="16" /> Buat Folder</AppButton>
    </div>
    <div class="space-y-3">
      <div
        v-for="{ folder, depth } in folderTree"
        :key="folder.id"
        class="relative"
        :style="{ marginLeft: `${Math.min(depth, 4) * 28}px` }"
      >
        <FolderCard :folder="folder" />
        <div class="absolute right-3 top-3 flex gap-1">
          <button class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink3 shadow-sm hover:text-brand" title="Buat subfolder" @click.prevent="createSubfolder(folder.id)"><FolderPlus :size="14" /></button>
          <button class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink3 shadow-sm hover:text-brand" title="Edit folder" @click.prevent="ui.openFolderModal(folder.id)"><Pencil :size="14" /></button>
          <button class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink3 shadow-sm hover:text-danger" title="Hapus folder" @click.prevent="removeFolder(folder.id)"><Trash2 :size="14" /></button>
        </div>
      </div>
      <EmptyState v-if="!folderTree.length" title="Belum ada folder" description="Buat root folder pertama untuk mulai menyusun dokumen." />
    </div>
  </PageShell>
</template>
