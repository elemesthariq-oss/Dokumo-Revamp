<script setup lang="ts">
const docs = useDocumentsStore()
const question = ref('')
const messages = ref<{ role: 'user' | 'ai'; text: string }[]>([
  { role: 'ai', text: 'Saya siap membantu menjawab pertanyaan berdasarkan isi dokumen.' },
])

function ask() {
  if (!question.value.trim()) return
  const q = question.value
  const found = searchDocuments(docs.documents, q, 'both')[0]
  messages.value.push({ role: 'user', text: q })
  messages.value.push({
    role: 'ai',
    text: found
      ? `Saya menemukan sumber terdekat: ${found.document.title}. Ringkasan: ${found.snippet}`
      : 'Saya belum menemukan dokumen yang cocok. Coba gunakan kata kunci berbeda.',
  })
  question.value = ''
}
</script>

<template>
  <PageShell title="Tanya Dokumen" subtitle="Chat AI sederhana untuk mencari jawaban dari isi dokumen.">
    <section class="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div class="max-h-[480px] space-y-3 overflow-y-auto">
        <div v-for="(message, index) in messages" :key="index" class="max-w-[80%] rounded-card px-4 py-3 text-[14px]" :class="message.role === 'ai' ? 'bg-surface2 text-ink2' : 'ml-auto bg-brandTint text-brandStrong'">
          {{ message.text }}
        </div>
      </div>
      <form class="mt-4 flex gap-2" @submit.prevent="ask">
        <input v-model="question" class="h-11 flex-1 rounded-btn border border-borderStrong px-3 text-[14px]" placeholder="Tanyakan isi dokumen...">
        <AppButton variant="primary" type="submit">Kirim</AppButton>
      </form>
    </section>
  </PageShell>
</template>
