<script setup lang="ts">
import { Bell, CircleHelp, LogOut, Settings, Sparkles, UserRound } from 'lucide-vue-next'
import { user } from '~/data/seed'

const ui = useUiStore()

function openNotifications() {
  ui.notificationsOpen = !ui.notificationsOpen
  ui.notificationsRead = true
  ui.helpOpen = false
  ui.profileOpen = false
}
</script>

<template>
  <header class="sticky top-0 z-30 hidden h-[71px] items-center justify-between overflow-visible border-b border-border bg-surface px-7 py-3.5 lg:flex">
    <button
      class="search-ring flex h-[46px] w-[640px] items-center justify-between rounded-[13px] bg-surface px-3.5 py-[11px] text-left"
      @click="ui.openSearch()"
    >
      <span class="flex min-w-0 items-center gap-3">
        <span class="brand-gradient flex h-[26px] w-[26px] items-center justify-center rounded-lg text-white">
          <Sparkles :size="15" />
        </span>
        <span class="truncate text-[14px] font-medium text-ink3">Cari dokumen lewat judul atau kata di dalam isinya...</span>
      </span>
      <span class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full bg-brandTint py-[3px] pl-2 pr-[9px] text-[10.5px] font-bold tracking-[0.03em] text-brand"><Sparkles :size="11" /> Smart AI</span>
        <Kbd>⌘K</Kbd>
      </span>
    </button>

    <div class="flex items-center gap-2.5">
      <div class="relative">
        <AppButton variant="icon" aria-label="Notifikasi" @click="openNotifications">
          <Bell :size="19" />
          <span v-if="!ui.notificationsRead" class="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
        </AppButton>
        <div v-if="ui.notificationsOpen" class="absolute right-0 top-12 w-80 rounded-card border border-border bg-surface p-3 shadow-sm">
          <div class="mb-2 text-[13px] font-bold">Notifikasi</div>
          <div v-for="item in ui.notifications" :key="item" class="rounded-ctl px-3 py-2 text-[12.5px] text-ink2 hover:bg-surface2">{{ item }}</div>
        </div>
      </div>

      <div class="relative">
        <AppButton variant="icon" aria-label="Bantuan" @click="ui.helpOpen = !ui.helpOpen; ui.notificationsOpen = false; ui.profileOpen = false">
          <CircleHelp :size="19" />
        </AppButton>
        <div v-if="ui.helpOpen" class="absolute right-0 top-12 w-72 rounded-card border border-border bg-surface p-4 shadow-sm">
          <div class="text-[13px] font-bold">Bantuan cepat</div>
          <p class="mt-1 text-[12.5px] text-ink3">Gunakan Smart AI untuk mencari judul dan isi dokumen. Buka pusat bantuan untuk panduan lengkap.</p>
          <NuxtLink to="/help" class="mt-3 inline-flex text-[12.5px] font-bold text-brandStrong">Buka Help and Guide</NuxtLink>
        </div>
      </div>

      <div class="relative">
        <button class="flex items-center gap-[9px] rounded-[11px] bg-surface py-1 pl-1 pr-2 hover:bg-surface2" @click="ui.profileOpen = !ui.profileOpen; ui.notificationsOpen = false; ui.helpOpen = false">
          <span class="avatar-gradient flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-bold text-white">{{ user.initials }}</span>
          <span class="text-left">
            <span class="block text-[13.5px] font-semibold">{{ user.name }}</span>
            <span class="block text-[11.5px] font-medium text-ink3">{{ user.role }}</span>
          </span>
        </button>
        <div v-if="ui.profileOpen" class="absolute right-0 top-14 w-56 rounded-card border border-border bg-surface p-2 shadow-sm">
          <NuxtLink to="/settings" class="flex items-center gap-2 rounded-ctl px-3 py-2 text-[13px] text-ink2 hover:bg-surface2"><UserRound :size="16" /> Profil</NuxtLink>
          <NuxtLink to="/settings" class="flex items-center gap-2 rounded-ctl px-3 py-2 text-[13px] text-ink2 hover:bg-surface2"><Settings :size="16" /> Pengaturan</NuxtLink>
          <button class="flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-left text-[13px] text-danger hover:bg-surface2" @click="ui.toast('Sesi demo ditutup', 'info')"><LogOut :size="16" /> Keluar</button>
        </div>
      </div>
    </div>
  </header>
</template>
