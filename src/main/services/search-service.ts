import Fuse from 'fuse.js'
import { SVNExecutor, SVNEntry } from '../modules/svn/executor'

export interface SearchResult {
  path: string
  name: string
  kind: 'file' | 'dir'
  score: number
  matches?: string[]
}

export interface ContentSearchResult {
  path: string
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

export class SearchService {
  private svnExecutor: SVNExecutor
  private cache: Map<string, SVNEntry[]> = new Map()

  constructor(svnExecutor: SVNExecutor) {
    this.svnExecutor = svnExecutor
  }

  /**
   * 文件名搜索（模糊搜索）
   */
  async searchFilename(
    query: string,
    basePath?: string
  ): Promise<SearchResult[]> {
    const entries = await this.getAllEntries(basePath)

    const fuse = new Fuse(entries, {
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
   * 文件内容搜索
   */
  async searchContent(
    query: string,
    username: string,
    password: string,
    basePath?: string
  ): Promise<ContentSearchResult[]> {
    const entries = await this.getAllEntries(basePath)
    const results: ContentSearchResult[] = []

    // 过滤出文件（非目录）
    const files = entries.filter(e => e.kind === 'file')

    // 支持常见文本文件扩展名
    const textExtensions = [
      '.txt', '.md', '.json', '.xml', '.yaml', '.yml',
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
      '.go', '.rs', '.rb', '.php', '.swift', '.kt',
      '.html', '.css', '.scss', '.sass', '.less',
      '.sql', '.sh', '.bash', '.zsh', '.ps1',
      '.conf', '.config', '.ini', '.env',
      '.java', '.properties', '.gradle', '.m'
    ]

    const textFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return textExtensions.includes(ext)
    })

    // 搜索文件内容
    const searchPromises = textFiles.map(async (file) => {
      try {
        const content = await this.svnExecutor.cat(file.path, username, password)
        const lines = content.split('\n')

        lines.forEach((line, lineIndex) => {
          const matchIndex = line.toLowerCase().indexOf(query.toLowerCase())
          if (matchIndex !== -1) {
            results.push({
              path: file.path,
              line: lineIndex + 1,
              content: line,
              matchStart: matchIndex,
              matchEnd: matchIndex + query.length
            })
          }
        })
      } catch {
        // 忽略无法读取的文件
      }
    })

    await Promise.all(searchPromises)

    return results
  }

  /**
   * 获取所有条目（带缓存）
   */
  private async getAllEntries(basePath?: string): Promise<SVNEntry[]> {
    const cacheKey = basePath || 'root'

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const entries = await this.fetchAllEntries(basePath || '')
    this.cache.set(cacheKey, entries)
    return entries
  }

  /**
   * 递归获取所有条目
   */
  private async fetchAllEntries(path: string): Promise<SVNEntry[]> {
    const results: SVNEntry[] = []

    try {
      const entries = await this.svnExecutor.list(path)

      for (const entry of entries) {
        results.push(entry)

        // 递归获取目录内容（深度限制为 3 层）
        if (entry.kind === 'dir' && path.split('/').length < 5) {
          try {
            const subEntries = await this.fetchAllEntries(entry.path)
            results.push(...subEntries)
          } catch {
            // 忽略无法访问的目录
          }
        }
      }
    } catch {
      // 忽略错误
    }

    return results
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
}