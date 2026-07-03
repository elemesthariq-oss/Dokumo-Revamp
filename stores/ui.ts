import { defineStore } from 'pinia'
import type { SearchScope, Toast } from '~/types'

export const useUiStore = defineStore('ui', {
  state: () => ({
    isSearchOpen: false,
    searchQuery: '',
    searchScope: 'both' as SearchScope,
    isUploadOpen: false,
    isQuickAccessOpen: false,
    isFilterOpen: false,
    isShareOpen: false,
    isFolderModalOpen: false,
    isEditDocumentOpen: false,
    editingFolderId: '',
    folderModalParentId: '',
    editingDocumentId: '',
    selectedDocumentId: '',
    activeQuickAccess: '',
    notificationsRead: false,
    notificationsOpen: false,
    helpOpen: false,
    profileOpen: false,
    toasts: [] as Toast[],
    quickAccess: ['Legal', 'UI/UX Design'],
    notifications: ['Dokumen baru masuk dari Scanner Front Office 01', 'Sync folder selesai', '3 dokumen Payroll siap ditinjau'],
  }),
  actions: {
    openSearch(query = '') {
      this.searchQuery = query
      this.isSearchOpen = true
    },
    closeSearch() {
      this.isSearchOpen = false
    },
    toast(message: string, type: Toast['type'] = 'info') {
      const id = crypto.randomUUID()
      this.toasts.push({ id, message, type })
      window.setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id)
      }, 3500)
    },
    addQuickAccess(name: string) {
      if (!this.quickAccess.includes(name)) this.quickAccess.push(name)
      this.toast('Akses cepat ditambahkan', 'success')
    },
    openShare(documentId: string) {
      this.selectedDocumentId = documentId
      this.isShareOpen = true
    },
    openFolderModal(folderId = '', parentId = '') {
      this.editingFolderId = folderId
      this.folderModalParentId = parentId
      this.isFolderModalOpen = true
    },
    openEditDocument(documentId: string) {
      this.editingDocumentId = documentId
      this.isEditDocumentOpen = true
    },
  },
})
