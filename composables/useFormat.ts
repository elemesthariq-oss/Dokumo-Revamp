import type { Category } from '~/types'

export const categoryStyles: Record<Category, { fg: string; bg: string; key: string }> = {
  Administrasi: { fg: '#2563eb', bg: '#eff5ff', key: 'admin' },
  Legal: { fg: '#b45309', bg: '#fff7ed', key: 'legal' },
  Payroll: { fg: '#047857', bg: '#ecfdf5', key: 'payroll' },
  'Training & Sertifikasi': { fg: '#7c3aed', bg: '#f5f1ff', key: 'training' },
  Keuangan: { fg: '#0891b2', bg: '#ecfeff', key: 'finance' },
}

export function formatScanDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace('.', '').replace(',', ' •')
}
