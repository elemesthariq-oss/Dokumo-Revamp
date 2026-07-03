<script setup lang="ts">
const docs = useDocumentsStore()
const items = computed(() => docs.documents.filter((doc) => doc.category !== 'Payroll'))
</script>

<template>
  <PageShell title="Dokumen Umum" subtitle="Dokumen operasional umum lintas kategori.">
    <DocumentTable :documents="items" />
  </PageShell>
</template>
