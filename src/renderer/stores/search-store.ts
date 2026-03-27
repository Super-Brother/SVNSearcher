import { create } from 'zustand'

interface SearchResult {
  path: string
  name: string
  kind: 'file' | 'dir'
  score: number
}

interface ContentSearchResult {
  path: string
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

interface SearchState {
  searchType: 'filename' | 'content'
  query: string
  results: SearchResult[] | ContentSearchResult[]
  loading: boolean
  setSearchType: (type: 'filename' | 'content') => void
  setQuery: (query: string) => void
  setResults: (results: SearchResult[] | ContentSearchResult[]) => void
  setLoading: (loading: boolean) => void
  clearResults: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  searchType: 'filename',
  query: '',
  results: [],
  loading: false,

  setSearchType: (type) => set({ searchType: type }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (loading) => set({ loading }),
  clearResults: () => set({ results: [], query: '' })
}))