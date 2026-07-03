<script setup lang="ts">
import { ChevronRight, FolderPlus, Pencil, Trash2, Upload } from 'lucide-vue-next'

const route = useRoute()
const docs = useDocumentsStore()
const ui = useUiStore()
const folderId = computed(() => String(route.params.id))
const folder = computed(() => docs.folders.find((item) => item.id === folderId.value))
const showNestedFiles = ref(false)
const childFolders = computed(() => docs.childFolders(folderId.value))
const directItems = computed(() => docs.documentsInFolder(folderId.value, 'direct'))
const recursiveItems = computed(() => docs.documentsInFolder(folderId.value, 'recursive'))
const items = computed(() => showNestedFiles.value ? recursiveItems.value : directItems.value)
const breadcrumb = computed(() => docs.folderPath(folderId.value))

function createSubfolder() {
  if (!folder.value) return
  ui.openFolderModal('', folder.value.id)
}

function openUploadInFolder() {
  if (!folder.value) return
  docs.setActiveFolder(folder.value.id)
  ui.isUploadOpen = true
}

function deleteFolder() {
  if (!folder.value) return
  let target = ''
  const descendants = docs.descendantFolderIds(folder.value.id)
  const hasNestedContent = directItems.value.length > 0 || childFolders.value.length > 0
  const targetOptions = docs.folders.filter((item) => item.id !== folder.value?.id && !descendants.includes(item.id))
  if (hasNestedContent) {
    target = window.prompt('Folder berisi file/subfolder. Masukkan ID folder tujuan pemindahan:', targetOptions[0]?.id ?? '') ?? ''
    if (!target || !targetOptions.some((item) => item.id === target)) {
      ui.toast('Folder tujuan tidak valid', 'error')
      return
    }
  }
  if (window.confirm('Hapus folder ini?')) {
    const deleted = docs.deleteFolder(folder.value.id, target)
    if (!deleted) {
      ui.toast('Folder gagal dihapus', 'error')
      return
    }
    ui.toast('Folder dihapus', 'success')
    navigateTo('/dokumen/ftp/folders')
  }
}
</script>

<template>
  <PageShell v-if="folder" :title="folder.name" :subtitle="folder.description || 'Detail folder dan daftar file di dalamnya.'">
    <template #prefix>
      <div class="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-ink3">
        <NuxtLink to="/dokumen/ftp/folders" class="rounded-lg py-1 pr-2 hover:text-brandStrong">Semua Folder</NuxtLink>
        <template v-for="(item, index) in breadcrumb" :key="item.id">
          <ChevronRight :size="14" class="text-ink3" />
          <NuxtLink
            :to="`/dokumen/ftp/folder/${item.id}`"
            class="rounded-lg px-2 py-1 hover:bg-surface2 hover:text-brandStrong"
            :class="index === breadcrumb.length - 1 ? 'text-ink' : ''"
          >
            {{ item.name }}
          </NuxtLink>
        </template>
      </div>
    </template>

    <template #actions>
      <AppButton @click="openUploadInFolder"><Upload :size="16" /> Upload File</AppButton>
      <AppButton @click="createSubfolder"><FolderPlus :size="16" /> Buat Subfolder</AppButton>
      <AppButton @click="ui.openFolderModal(folder.id)"><Pencil :size="16" /> Edit Folder</AppButton>
      <AppButton @click="deleteFolder"><Trash2 :size="16" /> Hapus Folder</AppButton>
    </template>

    <div class="space-y-4">
      <section class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-[16px] font-bold">Subfolder</h2>
            <p class="text-[13px] text-ink3">Folder langsung di dalam {{ folder.name }}.</p>
          </div>
          <AppButton @click="createSubfolder"><FolderPlus :size="16" /> Buat Subfolder</AppButton>
        </div>
        <div v-if="childFolders.length" class="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          <FolderCard v-for="item in childFolders" :key="item.id" :folder="item" />
        </div>
        <EmptyState v-else title="Belum ada subfolder" description="Buat subfolder untuk menyusun file bertingkat." />
      </section>

      <section class="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-[16px] font-bold">File dalam folder</h2>
            <p class="text-[13px] text-ink3">{{ showNestedFiles ? 'Menampilkan file folder ini dan semua subfolder.' : 'Menampilkan file langsung di folder ini.' }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              class="rounded-btn border px-3 py-2 text-[12px] font-bold transition"
              :class="!showNestedFiles ? 'border-brandTint2 bg-brandTint text-brandStrong' : 'border-borderStrong text-ink3 hover:text-ink'"
              @click="showNestedFiles = false"
            >
              Langsung
            </button>
            <button
              class="rounded-btn border px-3 py-2 text-[12px] font-bold transition"
              :class="showNestedFiles ? 'border-brandTint2 bg-brandTint text-brandStrong' : 'border-borderStrong text-ink3 hover:text-ink'"
              @click="showNestedFiles = true"
            >
              Termasuk subfolder
            </button>
            <NuxtLink to="/dokumen/ftp/folders"><AppButton><FolderPlus :size="16" /> Semua Folder</AppButton></NuxtLink>
          </div>
        </div>
        <DocumentTable :documents="items" />
      </section>
    </div>
  </PageShell>
  <EmptyState v-else title="Folder tidak ditemukan" description="Folder mungkin sudah dihapus atau data demo sudah di-reset." />
</template>
