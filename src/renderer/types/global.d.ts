// 声明 window.api 类型
// 由 preload/index.ts 中的 API 类型自动推断

declare global {
  interface Window {
    api: {
      auth: {
        login: (credentials: { url: string; username: string; password: string }) => Promise<any>
        logout: () => Promise<any>
        getStoredCredentials: () => Promise<any>
      }
      svn: {
        list: (path: string) => Promise<any>
        log: (path: string, limit?: number) => Promise<any>
        cat: (path: string) => Promise<any>
        info: (path: string) => Promise<any>
      }
      search: {
        filename: (query: string) => Promise<any>
        content: (query: string) => Promise<any>
      }
      index: {
        start: () => Promise<any>
        getStatus: () => Promise<any>
        clear: () => Promise<any>
        onProgress: (callback: (current: number) => void) => () => void
      }
      refresh: {
        start: (intervalMinutes: number) => Promise<any>
        stop: () => Promise<any>
        getStatus: () => Promise<any>
        onTriggered: (callback: () => void) => () => void
      }
      file: {
        download: (svnPath: string, savePath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
        selectDownloadDir: () => Promise<string | null>
      }
    }
  }
}

export {}