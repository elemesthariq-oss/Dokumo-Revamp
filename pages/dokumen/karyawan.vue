<script setup lang="ts">
const docs = useDocumentsStore()
const items = computed(() => docs.documents.filter((doc) => ['Payroll', 'Administrasi'].includes(doc.category)))
</script>

<template>
  <PageShell title="Dokumen Karyawan" subtitle="Dokumen payroll, administrasi, dan data pendukung karyawan.">
    <DocumentTable :documents="items" />
  </PageShell>
</template>
