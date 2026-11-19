// 全局状态：书架索引 + 当前书。每本书独立 localStorage key。
import { create } from 'zustand'
import type { Book, BookIndexItem } from './types'

const INDEX_KEY = 'writing-pen:index'
const bookKey = (id: string) => `writing-pen:book:${id}`

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function readIndex(): BookIndexItem[] {
  return readJSON<BookIndexItem[]>(INDEX_KEY) ?? []
}

function touchIndex(book: Book) {
  const items = readIndex().filter((b) => b.id !== book.id)
  items.unshift({ id: book.id, title: book.title, author: book.author, updatedAt: book.updatedAt })
  writeJSON(INDEX_KEY, items)
}

export function loadBook(id: string): Book | null {
  return readJSON<Book>(bookKey(id))
}

export function saveBook(book: Book) {
  const ok = writeJSON(bookKey(book.id), book)
  touchIndex(book)
  return ok
}

export function deleteBook(id: string) {
  localStorage.removeItem(bookKey(id))
  writeJSON(INDEX_KEY, readIndex().filter((b) => b.id !== id))
}

export function listBooks(): BookIndexItem[] {
  return readIndex().slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function saveImportedBook(book: Book) {
  saveBook(book)
}

interface AppState {
  book: Book | null
  view: 'write' | 'outline' | 'graph' | 'codex' | 'ideas' | 'stats'
  dirty: boolean
  storageWarning: boolean
  openBook: (id: string) => void
  setBook: (book: Book) => void
  closeBook: () => void
  updateBook: (fn: (draft: Book) => void, opts?: { immediate?: boolean }) => void
  setView: (v: AppState['view']) => void
  markSaved: () => void
  setStorageWarning: (v: boolean) => void
}

export const useApp = create<AppState>((set, get) => ({
  book: null,
  view: 'write',
  dirty: false,
  storageWarning: false,
  openBook: (id) => {
    const book = loadBook(id)
    set({ book, view: 'write', dirty: false })
  },
  setBook: (book) => set({ book }),
  closeBook: () => set({ book: null }),
  updateBook: (fn, opts) => {
    const current = get().book
    if (!current) return
    const draft: Book = structuredClone(current)
    fn(draft)
    draft.updatedAt = new Date().toISOString()
    set({ book: draft, dirty: !opts?.immediate })
    if (opts?.immediate) {
      saveBook(draft)
      set({ dirty: false })
    }
  },
  setView: (v) => set({ view: v }),
  markSaved: () => {
    const book = get().book
    if (book) saveBook(book)
    set({ dirty: false })
  },
  setStorageWarning: (v) => set({ storageWarning: v }),
}))

// 防抖保存：编辑正文等高频操作走这里
let saveTimer: ReturnType<typeof setTimeout> | null = null
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    useApp.getState().markSaved()
    saveTimer = null
  }, 1000)
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

export function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function chapterIdToTitle(book: Book, chapterId: string): string {
  for (const vol of book.volumes) {
    const ch = vol.chapters.find((c) => c.id === chapterId)
    if (ch) return ch.title
  }
  return chapterId
}
