<script setup lang="ts">
const ui = useUiStore()
</script>

<template>
  <PageShell title="Template" subtitle="Galeri template dokumen pembiayaan dan administrasi.">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="template in ['Perjanjian Pembiayaan', 'Checklist KTP Debitur', 'Form Share Dokumen', 'Template Invoice Dealer', 'Surat Tugas Karyawan', 'Checklist Sertifikasi']" :key="template" class="rounded-card border border-border bg-surface p-5 shadow-sm">
        <div class="brand-gradient mb-4 flex h-10 w-10 items-center justify-center rounded-ctl text-sm font-bold text-white">T</div>
        <h3 class="text-[14.5px] font-bold">{{ template }}</h3>
        <p class="mt-1 text-[13px] text-ink3">Siap digunakan sebagai standar dokumen internal.</p>
        <AppButton class="mt-4" @click="ui.toast('Template dibuka', 'info')">Buka Template</AppButton>
      </div>
    </div>
  </PageShell>
</template>
