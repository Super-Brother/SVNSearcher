import { exec, execFile } from 'child_process'
import { promisify } from 'util'
import { platform } from 'os'
import { parseString } from 'xml2js'

const execAsync = promisify(exec)
const parseXML = promisify(parseString)

export interface SVNEntry {
  name: string
  kind: 'file' | 'dir'
  path: string
  size?: number
  revision?: number
  author?: string
  date?: string
}

export interface SVNLogEntry {
  revision: number
  author: string
  date: string
  message: string
  paths: Array<{
    action: string
    path: string
  }>
}

export interface SVNInfo {
  url: string
  revision: number
  author?: string
  date?: string
  root: string
}

export class SVNExecutor {
  private svnPath: string

  constructor() {
    this.svnPath = this.detectSVNPath()
  }

  private detectSVNPath(): string {
    const os = platform()

    if (os === 'win32') {
      // Windows: 尝试常见的 SVN 安装路径
      const windowsPaths = [
        'C:\\Program Files\\TortoiseSVN\\bin\\svn.exe',
        'C:\\Program Files (x86)\\TortoiseSVN\\bin\\svn.exe',
        'C:\\Program Files\\CollabNet\\Subversion Client\\svn.exe',
        'svn' // 回退到 PATH
      ]
      // 返回第一个存在的路径或默认的 'svn'
      return 'svn'
    }

    // macOS/Linux: 使用系统 PATH
    return 'svn'
  }

  private async execute(
    args: string[],
    username?: string,
    password?: string
  ): Promise<string> {
    const authArgs = username && password
      ? ['--username', username, '--password', password, '--non-interactive']
      : ['--non-interactive']

    const allArgs = [...args, ...authArgs, '--xml']

    return new Promise((resolve, reject) => {
      execFile(this.svnPath, allArgs, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      })
    })
  }

  async testConnection(url: string, username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.execute(['info', url], username, password)
      return { success: true }
    } catch (error) {
      const errorMsg = (error as Error).message
      console.error('SVN connection error:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async list(path: string, username?: string, password?: string): Promise<SVNEntry[]> {
    console.log('SVN list 执行:', { path, username: username || '(空)', hasPassword: !!password })
    const output = await this.execute(['list', path], username, password)
    console.log('SVN list 输出长度:', output.length)
    console.log('SVN list 输出预览:', output.substring(0, 1000))

    const result = await parseXML(output) as any
    console.log('XML 解析结果 keys:', Object.keys(result))

    const entries: SVNEntry[] = []

    // 处理可能的两种 XML 结构:
    // 1. <lists><list>...</list></lists>
    // 2. <list>...</list> (直接以 list 为根)
    let lists: any[] = []

    if (result.lists?.list) {
      lists = Array.isArray(result.lists.list) ? result.lists.list : [result.lists.list]
      console.log('找到 lists.list 结构')
    } else if (result.list) {
      lists = Array.isArray(result.list) ? result.list : [result.list]
      console.log('找到 list 根结构')
    } else {
      console.log('未找到预期的 XML 结构，尝试其他路径')
      // 打印完整结构以便调试
      console.log('完整 XML 结构:', JSON.stringify(result, null, 2))
    }

    console.log('解析到的 lists 数量:', lists.length)

    for (const list of lists) {
      const listEntries = list.entry || []
      console.log('list 中的 entry 数量:', listEntries.length)
      for (const entry of listEntries) {
        const entryData = {
          name: entry.name?.[0] || '',
          kind: entry.$.kind === 'file' ? 'file' : 'dir',
          path: path + (path.endsWith('/') ? '' : '/') + entry.name?.[0],
          size: entry.size ? parseInt(entry.size[0], 10) : undefined,
          revision: entry.commit?.[0]?.$.revision ? parseInt(entry.commit[0].$.revision, 10) : undefined,
          author: entry.commit?.[0]?.author?.[0],
          date: entry.commit?.[0]?.date?.[0]
        }
        console.log('添加条目:', entryData.name, entryData.kind)
        entries.push(entryData)
      }
    }

    console.log('SVN list 返回条目数:', entries.length)
    return entries
  }

  async log(
    path: string,
    username?: string,
    password?: string,
    limit: number = 50
  ): Promise<SVNLogEntry[]> {
    const output = await this.execute(['log', path, '--limit', String(limit)], username, password)
    const result = await parseXML(output) as any

    const entries: SVNLogEntry[] = []
    const logEntries = result.log?.logentry || []

    for (const entry of logEntries) {
      const paths = (entry.paths?.[0]?.path || []).map((p: any) => ({
        action: p.$.action,
        path: p._
      }))

      entries.push({
        revision: parseInt(entry.$.revision, 10),
        author: entry.author?.[0] || '',
        date: entry.date?.[0] || '',
        message: entry.msg?.[0] || '',
        paths
      })
    }

    return entries
  }

  async cat(path: string, username?: string, password?: string): Promise<string> {
    const authArgs = username && password
      ? ['--username', username, '--password', password, '--non-interactive']
      : ['--non-interactive']

    return new Promise((resolve, reject) => {
      execFile(this.svnPath, ['cat', path, ...authArgs], { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      })
    })
  }

  async info(path: string, username?: string, password?: string): Promise<SVNInfo> {
    const output = await this.execute(['info', path], username, password)
    const result = await parseXML(output) as any

    const info = result.info?.entry?.[0]
    if (!info) {
      throw new Error('无法获取 SVN 信息')
    }

    return {
      url: info.url?.[0] || '',
      revision: parseInt(info.$.revision, 10),
      author: info.commit?.[0]?.author?.[0],
      date: info.commit?.[0]?.date?.[0],
      root: info.repository?.[0]?.root?.[0] || ''
    }
  }
}