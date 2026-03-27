import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
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

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

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
    mainWindow.webContents.openDevTools()
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
      const success = await svnExecutor!.testConnection(url, username, password)
      if (success) {
        await credentialStore!.saveCredentials(url, username, password)
      }
      return { success, error: success ? null : '连接失败，请检查凭证' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    await credentialStore!.clearCredentials()
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
  ipcMain.handle('search:filename', async (_event, query: string, basePath?: string) => {
    return searchService!.searchFilename(query, basePath)
  })

  ipcMain.handle('search:content', async (_event, query: string, basePath?: string) => {
    const creds = credentialStore!.getCredentials()
    if (!creds) throw new Error('未登录')
    return searchService!.searchContent(query, creds.username, creds.password, basePath)
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