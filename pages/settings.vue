<script setup lang="ts">
const docs = useDocumentsStore()
const ui = useUiStore()

function resetDemo() {
  if (!window.confirm('Reset semua folder dan file ke seed demo?')) return
  docs.resetDemoData()
  ui.toast('Data demo di-reset', 'success')
}
</script>

<template>
  <PageShell title="Settings" subtitle="Pengaturan profil, tampilan, dan akun.">
    <section class="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div class="flex items-center gap-4">
        <span class="avatar-gradient flex h-14 w-14 items-center justify-center rounded-full font-bold text-white">IM</span>
        <div>
          <h3 class="text-[16px] font-bold">Isabella Montgomery</h3>
          <p class="text-[13px] text-ink3">Admin • Mandiri Utama Finance</p>
        </div>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-2">
        <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Preferensi tampilan
          <select class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            <option>Light mode</option>
          </select>
        </label>
        <label class="text-[12px] font-bold uppercase tracking-[0.05em] text-ink3">Bahasa
          <select class="mt-1 h-10 w-full rounded-btn border border-borderStrong px-3 text-[14px] font-normal normal-case tracking-normal text-ink">
            <option>Bahasa Indonesia</option>
          </select>
        </label>
      </div>
      <div class="mt-6 rounded-card border border-border bg-surface2 p-4">
        <h3 class="text-[15px] font-bold">Data demo</h3>
        <p class="mt-1 text-[13px] text-ink3">Reset localStorage untuk kembali ke seed folder dan file awal.</p>
        <AppButton class="mt-3" @click="resetDemo">Reset data demo</AppButton>
      </div>
    </section>
  </PageShell>
</template>
