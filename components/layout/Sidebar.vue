<script setup lang="ts">
import { CircleHelp, FileStack, FolderKanban, GitBranch, Plus, Settings, Share2, Sparkles } from 'lucide-vue-next'

const route = useRoute()
const docs = useDocumentsStore()
const ui = useUiStore()
const expanded = ref(true)
const logoSrc = '/images/dokumo-logo.png'

const nav = [
  { label: 'Workflow', to: '/workflow', icon: GitBranch },
  { label: 'Dibagikan ke Saya', to: '/dibagikan', icon: Share2 },
  { label: 'Template', to: '/template', icon: FileStack },
]

const subnav = [
  { label: 'Dokumen Umum', to: '/dokumen/umum' },
  { label: 'Dokumen Karyawan', to: '/dokumen/karyawan' },
  { label: 'Dokumen FTP', to: '/dokumen/ftp' },
]

function quickAccess(name: string) {
  docs.setQuickAccess(name)
  ui.activeQuickAccess = docs.filters.quickAccess
  navigateTo('/dokumen/ftp')
}
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col justify-between border-r border-[#e2e8f0] bg-surface px-4 py-6 lg:flex">
    <div class="flex flex-col gap-3">
    <NuxtLink to="/" class="flex h-12 items-center justify-between rounded-[11px] px-3">
      <img :src="logoSrc" alt="Dokumo" class="h-8 w-auto object-contain">
      <span class="text-[14px] text-ink3">◧</span>
    </NuxtLink>

    <nav class="space-y-0.5 overflow-hidden">
      <NuxtLink
        v-for="item in nav.slice(0, 1)"
        :key="item.to"
        :to="item.to"
        class="flex h-[39px] items-center gap-[11px] rounded-[11px] px-3 text-[14px] font-medium transition hover:bg-surface2"
        :class="route.path === item.to ? 'bg-brandTint text-brandStrong' : 'text-ink2'"
      >
        <component :is="item.icon" :size="19" />
        {{ item.label }}
      </NuxtLink>

      <button
        class="flex h-[39px] w-full items-center gap-[11px] rounded-[11px] px-3 text-left text-[14px] font-medium transition hover:bg-surface2"
        :class="route.path.startsWith('/dokumen') ? 'bg-brandTint text-brandStrong' : 'text-ink2'"
        @click="expanded = !expanded"
      >
        <FolderKanban :size="19" />
        <span class="flex-1">Manajemen Dokumen</span>
      </button>

      <div v-if="expanded" class="space-y-px py-0.5">
        <NuxtLink
          v-for="item in subnav"
          :key="item.to"
          :to="item.to"
          class="flex h-[33px] items-center gap-[9px] rounded-[9px] py-2 pl-[43px] pr-3 text-[13.5px] transition hover:bg-surface2"
          :class="route.path === item.to ? 'font-semibold text-brandStrong' : 'font-medium text-ink2'"
        >
          <span class="h-[5px] w-[5px] rounded-full" :class="route.path === item.to ? 'bg-brand' : 'bg-[#cbd5e1]'" />
          {{ item.label }}
        </NuxtLink>
      </div>

      <NuxtLink
        v-for="item in nav.slice(1)"
        :key="item.to"
        :to="item.to"
        class="flex h-[39px] items-center gap-[11px] rounded-[11px] px-3 text-[14px] font-medium transition hover:bg-surface2"
        :class="route.path === item.to ? 'bg-brandTint text-brandStrong' : 'text-ink2'"
      >
        <component :is="item.icon" :size="19" />
        <span class="flex-1">{{ item.label }}</span>
        <span v-if="item.badge" class="rounded-full border border-border bg-surface2 px-[7px] py-px text-[11px] font-semibold text-brand">{{ item.badge }}</span>
      </NuxtLink>
    </nav>

    <div>
      <div class="flex items-center justify-between px-3 pb-1.5 pt-3.5">
        <span class="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink3">Akses Cepat</span>
        <button class="flex h-5 w-5 items-center justify-center text-ink3 hover:text-brand" @click="ui.isQuickAccessOpen = true">
          <Plus :size="14" />
        </button>
      </div>
      <button
        v-for="item in ui.quickAccess"
        :key="item"
        class="flex h-[39px] w-full items-center gap-[11px] rounded-[11px] px-3 text-left text-[14px] font-medium transition hover:bg-surface2"
        :class="docs.filters.quickAccess === item ? 'bg-brandTint text-brandStrong' : 'text-ink2'"
        @click="quickAccess(item)"
      >
        <Sparkles :size="17" />
        {{ item }}
      </button>
    </div>
    </div>

    <div class="space-y-0">
      <NuxtLink to="/help" class="flex h-11 items-center gap-2 rounded px-3 text-[14px] font-medium text-[#101010] hover:bg-surface2">
        <CircleHelp :size="20" /> Help and Guide
      </NuxtLink>
      <NuxtLink to="/settings" class="flex h-11 items-center gap-2 rounded px-3 text-[14px] font-medium text-[#101010] hover:bg-surface2">
        <Settings :size="20" /> Settings
      </NuxtLink>
    </div>
  </aside>

  <div class="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
    <NuxtLink to="/" class="flex items-center">
      <img :src="logoSrc" alt="Dokumo" class="h-7 w-auto object-contain">
    </NuxtLink>
  </div>
</template>
