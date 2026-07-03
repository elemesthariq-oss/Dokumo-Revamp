<script setup lang="ts">
const ui = useUiStore()
const docs = useDocumentsStore()
const email = ref('')

function submit() {
  const recipient = email.value || 'tim terkait'
  if (ui.selectedDocumentId) docs.shareDocument(ui.selectedDocumentId, recipient)
  ui.toast(`Dokumen dibagikan ke ${recipient}`, 'success')
  email.value = ''
  ui.isShareOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.isShareOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1733]/45 p-4" @click.self="ui.isShareOpen = false">
      <form class="w-full max-w-md rounded-[18px] bg-surface p-5 shadow-modal" @submit.prevent="submit">
        <h2 class="text-[16px] font-bold">Bagikan dokumen</h2>
        <p class="mt-1 text-[13px] text-ink3">Masukkan email atau nama tim penerima akses dokumen.</p>
        <input v-model="email" autofocus class="mt-4 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px]" placeholder="finance@muf.co.id">
        <div class="mt-5 flex justify-end gap-2">
          <AppButton @click="ui.isShareOpen = false">Batal</AppButton>
          <AppButton variant="primary" type="submit">Bagikan</AppButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>
