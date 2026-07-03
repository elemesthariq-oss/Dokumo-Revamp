<template>
  <PageShell title="Workflow" subtitle="Aturan auto-routing scanner ke folder Dokumo.">
    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="rule in [
        'Jika kategori Legal -> Folder Agreement',
        'Jika dokumen memuat NPWP atau PPN -> Folder NPWP',
        'Jika source HR Scanner 02 -> Folder Employment',
        'Jika judul memuat invoice/faktur -> Folder Invoice'
      ]" :key="rule" class="rounded-card border border-border bg-surface p-4 shadow-sm">
        <div class="text-[14px] font-bold text-ink">{{ rule }}</div>
        <p class="mt-1 text-[13px] text-ink3">Status aktif, dijalankan saat dokumen baru masuk.</p>
      </div>
    </div>
  </PageShell>
</template>
