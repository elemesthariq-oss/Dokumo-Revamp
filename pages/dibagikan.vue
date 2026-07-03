<script setup lang="ts">
const docs = useDocumentsStore()
const items = computed(() => docs.documents.filter((doc) => doc.sharedWithMe))
</script>

<template>
  <PageShell title="Dibagikan ke Saya" subtitle="Dokumen yang dibagikan kepada akun Isabella Montgomery.">
    <DocumentGrid :documents="items" />
  </PageShell>
</template>
