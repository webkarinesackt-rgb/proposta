import { Proposal } from './types'

const KEY = 'fysi_proposals'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function genSlug() {
  return Math.random().toString(36).slice(2, 9)
}

export const proposalStore = {
  getAll(): Proposal[] {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      return []
    }
  },

  get(id: string): Proposal | null {
    return this.getAll().find(p => p.id === id) ?? null
  },

  save(proposal: Proposal): Proposal {
    const all = this.getAll()
    const isNew = !proposal.id
    const saved: Proposal = {
      ...proposal,
      id: proposal.id || genId(),
      slug: proposal.slug || genSlug(),
    }
    const idx = all.findIndex(p => p.id === saved.id)
    if (idx >= 0) {
      all[idx] = saved
    } else {
      all.unshift(saved)
    }
    localStorage.setItem(KEY, JSON.stringify(all))
    return saved
  },

  remove(id: string): void {
    const all = this.getAll().filter(p => p.id !== id)
    localStorage.setItem(KEY, JSON.stringify(all))
  },

  updateStatus(id: string, status: Proposal['status']): void {
    const all = this.getAll().map(p =>
      p.id === id ? { ...p, status } : p
    )
    localStorage.setItem(KEY, JSON.stringify(all))
  },
}
