import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { CredentialStore } from './modules/auth/credential-store'
import { SVNExecutor } from './modules/svn/executor'
import { SearchService } from './services/search-service'
import { RefreshScheduler } from './services/refresh-scheduler'

// 禁用安全警告（开发模式）
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let mainWindow: BrowserWindow | null = null
let credentialStore: CredentialStore | null = null
let svnExecutor: SVNExecutor | null = null
let searchService: SearchService | null = null
let refreshScheduler: RefreshScheduler | null = null

// 开发服务器 URL（electron-vite 会自动注入 VITE_DEV_SERVER_URL）
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : undefined)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: 'default',
    trafficLightPosition: { x: 15, y: 15 }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // 生产环境不打开开发者工具
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function initializeServices() {
  credentialStore = new CredentialStore()
  svnExecutor = new SVNExecutor()
  searchService = new SearchService(svnExecutor)
  refreshScheduler = new RefreshScheduler()
}

function setupIPC() {
  // 认证相关
  ipcMain.handle('auth:login', async (_event, credentials) => {
    const { url, username, password } = credentials
    try {
      const result = await svnExecutor!.testConnection(url, username, password)
      if (result.success) {
        await credentialStore!.saveCredentials(url, username, password)
        // 设置搜索服务的仓库 URL 和凭证
        searchService!.setRepoUrl(url)
        searchService!.setCredentials(username || '', password || '')
      }
      return { success: result.success, error: result.error || (result.success ? null : '连接失败，请检查凭证') }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    await credentialStore!.clearCredentials()
    searchService?.clearCredentials()
    refreshScheduler?.stop()
    return { success: true }
  })

  ipcMain.handle('auth:getStoredCredentials', async () => {
    return credentialStore!.getCredentials()
  })

  // SVN 操作
  ipcMain.handle('svn:list', async (_event, path: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return svnExecutor!.list(path, creds.username, creds.password)
  })

  ipcMain.handle('svn:log', async (_event, path: string, limit?: number) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return svnExecutor!.log(path, creds.username, creds.password, limit)
  })

  ipcMain.handle('svn:cat', async (_event, path: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return svnExecutor!.cat(path, creds.username, creds.password)
  })

  ipcMain.handle('svn:info', async (_event, path: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return svnExecutor!.info(path, creds.username, creds.password)
  })

  // 搜索
  ipcMain.handle('search:filename', async (_event, query: string) => {
    return searchService!.searchFilename(query)
  })

  ipcMain.handle('search:content', async (_event, query: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return searchService!.searchContent(query, creds.username, creds.password)
  })

  // 索引管理
  ipcMain.handle('index:start', async () => {
    return searchService!.indexRepository((current, _total) => {
      mainWindow?.webContents.send('index:progress', current)
    })
  })

  ipcMain.handle('index:getStatus', async () => {
    return searchService!.getIndexStatus()
  })

  ipcMain.handle('index:clear', async () => {
    searchService!.clearIndex()
    return { success: true }
  })

  // 刷新调度
  ipcMain.handle('refresh:start', async (_event, intervalMinutes: number) => {
    refreshScheduler!.start(intervalMinutes, async () => {
      const creds = credentialStore!.getCredentials()
      if (creds && svnExecutor) {
        mainWindow?.webContents.send('refresh:triggered')
      }
    })
    return { success: true }
  })

  ipcMain.handle('refresh:stop', async () => {
    refreshScheduler?.stop()
    return { success: true }
  })

  ipcMain.handle('refresh:getStatus', async () => {
    return refreshScheduler!.getStatus()
  })

  // 文件下载
  ipcMain.handle('file:download', async (_event, svnPath: string, savePath?: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')

    try {
      // 获取文件内容
      const content = await svnExecutor!.cat(svnPath, creds.username, creds.password)

      // 从 SVN 路径提取文件名
      const fileName = svnPath.split('/').pop() || 'download'

      // 如果没有指定保存路径，使用默认下载目录
      let targetPath = savePath
      if (!targetPath) {
        // 获取用户下载目录
        const downloadsPath = app.getPath('downloads')
        targetPath = join(downloadsPath, fileName)
      } else if (!targetPath.endsWith(fileName)) {
        // 如果是目录路径，添加文件名
        targetPath = join(targetPath, fileName)
      }

      // 确保目录存在
      const dir = join(targetPath, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // 写入文件
      writeFileSync(targetPath, content, 'utf-8')

      return { success: true, path: targetPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 选择下载目录
  ipcMain.handle('file:selectDownloadDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择下载目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: app.getPath('downloads')
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}

app.whenReady().then(() => {
  initializeServices()
  setupIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  refreshScheduler?.stop()
})