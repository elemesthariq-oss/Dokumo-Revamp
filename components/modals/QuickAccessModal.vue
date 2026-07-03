<script setup lang="ts">
const ui = useUiStore()
const name = ref('')
const source = ref('Koleksi Dokumen')

function submit() {
  if (!name.value.trim()) return
  ui.addQuickAccess(name.value.trim())
  name.value = ''
  ui.isQuickAccessOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isQuickAccessOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1733]/45 p-4" @click.self="ui.isQuickAccessOpen = false">
      <form class="w-full max-w-md rounded-[18px] bg-surface p-5 shadow-modal" @submit.prevent="submit">
        <h2 class="text-[16px] font-bold">Tambah akses cepat</h2>
        <label class="mt-4 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Nama</label>
        <input v-model="name" autofocus class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]" placeholder="Contoh: Audit">
        <label class="mt-3 block text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Sumber</label>
        <select v-model="source" class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]">
          <option>Koleksi Dokumen</option>
          <option>Kategori</option>
          <option>Folder</option>
        </select>
        <div class="mt-5 flex justify-end gap-2">
          <AppButton @click="ui.isQuickAccessOpen = false">Batal</AppButton>
          <AppButton variant="primary" type="submit">Tambah</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
