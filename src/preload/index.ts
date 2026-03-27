import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
const api = {
  // 认证
  auth: {
    login: (credentials: { url: string; username: string; password: string }) =>
      ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getStoredCredentials: () => ipcRenderer.invoke('auth:getStoredCredentials')
  },

  // SVN 操作
  svn: {
    list: (path: string) => ipcRenderer.invoke('svn:list', path),
    log: (path: string, limit?: number) => ipcRenderer.invoke('svn:log', path, limit),
    cat: (path: string) => ipcRenderer.invoke('svn:cat', path),
    info: (path: string) => ipcRenderer.invoke('svn:info', path)
  },

  // 搜索
  search: {
    filename: (query: string, basePath?: string) =>
      ipcRenderer.invoke('search:filename', query, basePath),
    content: (query: string, basePath?: string) =>
      ipcRenderer.invoke('search:content', query, basePath)
  },

  // 刷新调度
  refresh: {
    start: (intervalMinutes: number) => ipcRenderer.invoke('refresh:start', intervalMinutes),
    stop: () => ipcRenderer.invoke('refresh:stop'),
    getStatus: () => ipcRenderer.invoke('refresh:getStatus'),
    onTriggered: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('refresh:triggered', handler)
      return () => ipcRenderer.removeListener('refresh:triggered', handler)
    }
  }
}

// 类型定义
export type API = typeof api

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('api', api)