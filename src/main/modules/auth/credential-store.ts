import { safeStorage } from 'electron'
import Store from 'electron-store'

interface Credentials {
  url: string
  username: string
  password: string
}

interface StoredCredentials {
  url: string
  username: string
  encryptedPassword: string
}

export class CredentialStore {
  private store: Store
  private credentials: Credentials | null = null

  constructor() {
    this.store = new Store({
      name: 'credentials',
      encryptionKey: this.generateEncryptionKey()
    })
    this.loadCredentials()
  }

  private generateEncryptionKey(): string {
    // 使用 electron-store 的内置加密
    return 'svn-searcher-credentials-key'
  }

  async saveCredentials(url: string, username: string, password: string): Promise<void> {
    // 使用 safeStorage 加密密码
    const encryptedPassword = safeStorage.encryptString(password).toString('base64')

    const stored: StoredCredentials = {
      url,
      username,
      encryptedPassword
    }

    this.store.set('credentials', stored)
    this.credentials = { url, username, password }
  }

  private loadCredentials(): void {
    const stored = this.store.get('credentials') as StoredCredentials | undefined
    if (stored && safeStorage.isEncryptionAvailable()) {
      try {
        const password = safeStorage.decryptString(
          Buffer.from(stored.encryptedPassword, 'base64')
        )
        this.credentials = {
          url: stored.url,
          username: stored.username,
          password
        }
      } catch {
        this.credentials = null
      }
    }
  }

  getCredentials(): Credentials | null {
    return this.credentials
  }

  async clearCredentials(): Promise<void> {
    this.store.delete('credentials')
    this.credentials = null
  }

  hasCredentials(): boolean {
    return this.credentials !== null
  }
}