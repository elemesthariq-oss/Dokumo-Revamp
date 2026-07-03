<script setup lang="ts">
import type { Category } from '~/types'

const ui = useUiStore()
const docs = useDocumentsStore()
const folder = computed(() => docs.folders.find((item) => item.id === ui.editingFolderId))
const name = ref('')
const category = ref<Category>('Administrasi')
const parentId = ref('')
const description = ref('')
const parentOptions = computed(() => {
  const excluded = folder.value ? [folder.value.id, ...docs.descendantFolderIds(folder.value.id)] : []
  return docs.folders.filter((item) => !excluded.includes(item.id))
})

watch(() => ui.isFolderModalOpen, (open) => {
  if (!open) return
  name.value = folder.value?.name ?? ''
  category.value = folder.value?.category ?? 'Administrasi'
  parentId.value = folder.value ? folder.value.parentId ?? '' : ui.folderModalParentId
  description.value = folder.value?.description ?? ''
})

function close() {
  ui.isFolderModalOpen = false
  ui.editingFolderId = ''
  ui.folderModalParentId = ''
}

function submit() {
  if (!name.value.trim()) return
  if (folder.value) {
    const updated = docs.updateFolder(folder.value.id, { name: name.value.trim(), category: category.value, parentId: parentId.value || null, description: description.value.trim() })
    if (updated === false) {
      ui.toast('Parent folder tidak valid', 'error')
      return
    }
    ui.toast('Folder diperbarui', 'success')
  }
  else {
    docs.createFolder({ name: name.value.trim(), category: category.value, parentId: parentId.value || null, description: description.value.trim() })
    ui.toast('Folder dibuat', 'success')
  }
  close()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isFolderModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1733]/45 p-4" @click.self="close">
      <form class="w-full max-w-md rounded-[18px] bg-surface p-5 shadow-modal" @submit.prevent="submit">
        <h2 class="text-[16px] font-bold">{{ folder ? 'Edit folder' : 'Buat folder' }}</h2>
        <label class="mt-4 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Nama folder</label>
        <input v-model="name" autofocus class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]" placeholder="Folder Audit">
        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Kategori</label>
        <select v-model="category" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]">
          <option v-for="item in docs.categories" :key="item" :value="item">{{ item }}</option>
        </select>
        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Parent folder</label>
        <select v-model="parentId" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]">
          <option value="">Root folder</option>
          <option v-for="item in parentOptions" :key="item.id" :value="item.id">{{ docs.folderPathLabel(item.id) }}</option>
        </select>
        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Deskripsi</label>
        <textarea v-model="description" class="mt-1 min-h-24 w-full rounded-btn border border-borderStrong px-3 py-2 text-[14px]" placeholder="Catatan folder untuk testing real case" />
        <div class="mt-5 flex justify-end gap-2">
          <AppButton @click="close">Batal</AppButton>
          <AppButton variant="primary" type="submit">{{ folder ? 'Simpan' : 'Buat Folder' }}</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
