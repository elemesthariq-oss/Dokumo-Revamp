<template>
  <PageShell title="Help and Guide" subtitle="Panduan singkat menggunakan Dokumo.">
    <div class="grid gap-3 md:grid-cols-2">
      <article v-for="item in ['Cara memakai Smart AI Search', 'Mengunggah dokumen scan', 'Mengatur filter dan folder', 'Membagikan dokumen']" :key="item" class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h3 class="text-[14.5px] font-bold">{{ item }}</h3>
        <p class="mt-2 text-[13px] leading-6 text-ink2">Ikuti langkah di layar dan gunakan tombol aksi yang tersedia. Semua fitur demo terhubung ke state aplikasi.</p>
      </article>
    </div>
  </PageShell>
</template>
