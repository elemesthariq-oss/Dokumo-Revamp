<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core'
import SmartSearchPalette from '~/components/search/SmartSearchPalette.vue'
import UploadModal from '~/components/upload/UploadModal.vue'
import QuickAccessModal from '~/components/modals/QuickAccessModal.vue'
import ShareModal from '~/components/modals/ShareModal.vue'
import FolderModal from '~/components/modals/FolderModal.vue'
import EditDocumentModal from '~/components/modals/EditDocumentModal.vue'
import ToastStack from '~/components/ui/ToastStack.vue'
import DocumentAssistant from '~/components/document/DocumentAssistant.vue'

const ui = useUiStore()
const docs = useDocumentsStore()
const keys = useMagicKeys()
whenever(keys['Meta+K'], () => ui.openSearch())
whenever(keys['Ctrl+K'], () => ui.openSearch())

onMounted(() => docs.hydrate())
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <Sidebar />
    <div class="lg:pl-[248px]">
      <TopBar />
      <main class="px-4 py-5 sm:px-7 sm:py-[26px] lg:min-h-[calc(100vh-71px)]">
        <slot />
      </main>
    </div>
    <SmartSearchPalette />
    <UploadModal />
    <QuickAccessModal />
    <ShareModal />
    <FolderModal />
    <EditDocumentModal />
    <ToastStack />
    <DocumentAssistant />
  </div>
</template>
