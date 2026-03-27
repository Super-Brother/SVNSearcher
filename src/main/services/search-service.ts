import Store from 'electron-store'
import Fuse from 'fuse.js'
import { SVNExecutor, SVNEntry } from '../modules/svn/executor'

export interface SearchResult {
  path: string
  name: string
  kind: 'file' | 'dir'
  score: number
}

export interface ContentSearchResult {
  path: string
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

interface StoredIndex {
  repoUrl: string
  entries: SVNEntry[]
  lastUpdated: string
  totalFiles: number
  totalDirs: number
}

export class SearchService {
  private svnExecutor: SVNExecutor
  private store: Store
  private credentials: { username: string; password: string } = { username: '', password: '' }
  private repoUrl: string = ''
  private entries: SVNEntry[] = []
  private isIndexing: boolean = false

  constructor(svnExecutor: SVNExecutor) {
    this.svnExecutor = svnExecutor
    this.store = new Store({ name: 'svn-index' })
  }

  /**
   * 设置仓库 URL
   */
  setRepoUrl(url: string): void {
    console.log('设置仓库 URL:', url)
    this.repoUrl = url
    // 尝试从本地存储加载索引
    this.loadFromStorage()
  }

  /**
   * 设置凭证
   */
  setCredentials(username: string, password: string): void {
    console.log('设置凭证:', username || '(空)')
    this.credentials = { username: username || '', password: password || '' }
  }

  /**
   * 清除凭证
   */
  clearCredentials(): void {
    this.credentials = { username: '', password: '' }
    this.repoUrl = ''
    this.entries = []
  }

  /**
   * 生成仓库的唯一存储键
   */
  private getStorageKey(): string {
    // 使用 URL 的 hash 作为键名，确保每个仓库独立存储
    const crypto = require('crypto')
    return 'repo_' + crypto.createHash('md5').update(this.repoUrl).digest('hex').substring(0, 8)
  }

  /**
   * 从本地存储加载索引
   */
  private loadFromStorage(): void {
    try {
      if (!this.repoUrl) return

      const key = this.getStorageKey()
      const stored = this.store.get(key) as StoredIndex | undefined
      if (stored && stored.entries && stored.entries.length > 0) {
        this.entries = stored.entries
        console.log(`从本地加载索引 [${key}]: ${this.entries.length} 个条目, 最后更新: ${stored.lastUpdated}`)
      } else {
        this.entries = []
        console.log(`本地无索引数据 [${key}]`)
      }
    } catch (error) {
      console.error('加载本地索引失败:', error)
      this.entries = []
    }
  }

  /**
   * 保存索引到本地存储
   */
  private saveToStorage(): void {
    try {
      const files = this.entries.filter(e => e.kind === 'file')
      const dirs = this.entries.filter(e => e.kind === 'dir')

      const data: StoredIndex = {
        repoUrl: this.repoUrl,
        entries: this.entries,
        lastUpdated: new Date().toISOString(),
        totalFiles: files.length,
        totalDirs: dirs.length
      }

      const key = this.getStorageKey()
      this.store.set(key, data)
      console.log(`索引已保存 [${key}]: ${this.entries.length} 个条目`)
    } catch (error) {
      console.error('保存索引失败:', error)
    }
  }

  /**
   * 拉取仓库目录（全量索引）
   */
  async indexRepository(onProgress?: (current: number, total: number) => void): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.isIndexing) {
      return { success: false, count: 0, error: '正在索引中，请稍候' }
    }

    if (!this.repoUrl) {
      return { success: false, count: 0, error: '仓库地址未设置，请先登录' }
    }

    this.isIndexing = true
    this.entries = []

    try {
      console.log('开始索引仓库:', this.repoUrl)
      console.log('凭证:', this.credentials.username || '(匿名)')

      // 递归获取所有条目
      await this.fetchAllEntries(this.repoUrl, onProgress)

      // 保存到本地
      this.saveToStorage()

      const files = this.entries.filter(e => e.kind === 'file').length
      const dirs = this.entries.filter(e => e.kind === 'dir').length
      console.log(`索引完成: ${files} 个文件, ${dirs} 个目录`)

      if (this.entries.length === 0) {
        return { success: false, count: 0, error: '未获取到任何文件，请检查仓库地址是否正确' }
      }

      return { success: true, count: this.entries.length }
    } catch (error) {
      console.error('索引仓库失败:', error)
      return { success: false, count: 0, error: (error as Error).message }
    } finally {
      this.isIndexing = false
    }
  }

  /**
   * 递归获取所有条目
   */
  private async fetchAllEntries(
    path: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    console.log('获取目录:', path)
    console.log('使用凭证:', { username: this.credentials.username || '(空)', hasPassword: !!this.credentials.password })

    try {
      const entries = await this.svnExecutor.list(
        path,
        this.credentials.username,
        this.credentials.password
      )

      console.log(`目录 ${path} 获取到 ${entries.length} 个条目`)
      if (entries.length > 0) {
        console.log('前几个条目:', entries.slice(0, 3).map(e => ({ name: e.name, kind: e.kind, path: e.path })))
      }

      // 收集目录用于递归
      const dirs: SVNEntry[] = []

      for (const entry of entries) {
        this.entries.push(entry)
        if (entry.kind === 'dir') {
          dirs.push(entry)
        }
      }

      // 报告进度
      if (onProgress) {
        onProgress(this.entries.length)
      }

      // 并行处理子目录
      console.log(`发现 ${dirs.length} 个子目录，开始递归获取...`)
      const batchSize = 5
      for (let i = 0; i < dirs.length; i += batchSize) {
        const batch = dirs.slice(i, i + batchSize)
        console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(dirs.length / batchSize)}: ${batch.map(d => d.name).join(', ')}`)
        await Promise.all(batch.map(dir => this.fetchAllEntries(dir.path, onProgress)))
      }
      console.log(`目录 ${path} 处理完成`)
    } catch (error) {
      console.error(`获取目录失败 ${path}:`, error)
      throw error
    }
  }

  /**
   * 文件名搜索（从本地索引查询）
   */
  async searchFilename(query: string): Promise<SearchResult[]> {
    if (this.entries.length === 0) {
      // 尝试从本地加载
      this.loadFromStorage()

      if (this.entries.length === 0) {
        console.warn('没有索引数据，请先拉取仓库目录')
        return []
      }
    }

    const fuse = new Fuse(this.entries, {
      keys: ['name', 'path'],
      threshold: 0.4,
      includeScore: true,
      findAllMatches: true
    })

    const results = fuse.search(query)

    return results.map(result => ({
      path: result.item.path,
      name: result.item.name,
      kind: result.item.kind,
      score: result.score || 0
    }))
  }

  /**
   * 文件内容搜索（需要实时读取文件）
   */
  async searchContent(
    query: string,
    username: string,
    password: string
  ): Promise<ContentSearchResult[]> {
    if (this.entries.length === 0) {
      this.loadFromStorage()
    }

    const results: ContentSearchResult[] = []
    const files = this.entries.filter(e => e.kind === 'file')

    // 支持的文本文件扩展名
    const textExtensions = new Set([
      '.txt', '.md', '.json', '.xml', '.yaml', '.yml',
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
      '.go', '.rs', '.rb', '.php', '.swift', '.kt',
      '.html', '.css', '.scss', '.sass', '.less',
      '.sql', '.sh', '.bash', '.zsh', '.ps1',
      '.conf', '.config', '.ini', '.env',
      '.properties', '.gradle', '.m', '.bat', '.cmd'
    ])

    const textFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return textExtensions.has(ext)
    })

    // 分批搜索
    const batchSize = 10
    for (let i = 0; i < textFiles.length; i += batchSize) {
      const batch = textFiles.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await this.svnExecutor.cat(file.path, username, password)
            const lines = content.split('\n')
            const matches: ContentSearchResult[] = []

            lines.forEach((line, lineIndex) => {
              const matchIndex = line.toLowerCase().indexOf(query.toLowerCase())
              if (matchIndex !== -1) {
                matches.push({
                  path: file.path,
                  line: lineIndex + 1,
                  content: line.substring(0, 500),
                  matchStart: matchIndex,
                  matchEnd: matchIndex + query.length
                })
              }
            })
            return matches
          } catch {
            return []
          }
        })
      )
      results.push(...batchResults.flat())
    }

    return results
  }

  /**
   * 获取索引状态
   */
  getIndexStatus(): {
    isIndexing: boolean
    hasIndex: boolean
    entryCount: number
    lastUpdated: string | null
  } {
    let lastUpdated: string | null = null
    let storedCount = 0

    try {
      if (this.repoUrl) {
        const key = this.getStorageKey()
        const stored = this.store.get(key) as StoredIndex | undefined
        if (stored && stored.entries && stored.entries.length > 0) {
          lastUpdated = stored.lastUpdated
          storedCount = stored.entries.length
          // 如果内存中没有数据，从存储加载
          if (this.entries.length === 0) {
            this.entries = stored.entries
          }
        }
      }
    } catch {
      // ignore
    }

    return {
      isIndexing: this.isIndexing,
      hasIndex: this.entries.length > 0 || storedCount > 0,
      entryCount: this.entries.length || storedCount,
      lastUpdated
    }
  }

  /**
   * 清除索引
   */
  clearIndex(): void {
    this.entries = []
    if (this.repoUrl) {
      const key = this.getStorageKey()
      this.store.delete(key)
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.entries = []
  }
}