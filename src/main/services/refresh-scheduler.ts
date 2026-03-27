export interface RefreshStatus {
  isRunning: boolean
  intervalMinutes: number
  lastRefresh: Date | null
  nextRefresh: Date | null
}

export class RefreshScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private intervalMinutes: number = 10
  private lastRefresh: Date | null = null
  private callback: (() => Promise<void>) | null = null

  start(intervalMinutes: number, callback: () => Promise<void>): void {
    this.stop()
    this.intervalMinutes = intervalMinutes
    this.callback = callback

    // 立即执行一次
    this.executeRefresh()

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.executeRefresh()
    }, intervalMinutes * 60 * 1000)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.callback = null
  }

  private async executeRefresh(): Promise<void> {
    if (this.callback) {
      try {
        await this.callback()
        this.lastRefresh = new Date()
      } catch (error) {
        console.error('刷新失败:', error)
      }
    }
  }

  getStatus(): RefreshStatus {
    const nextRefresh = this.intervalId
      ? new Date(Date.now() + this.intervalMinutes * 60 * 1000)
      : null

    return {
      isRunning: this.intervalId !== null,
      intervalMinutes: this.intervalMinutes,
      lastRefresh: this.lastRefresh,
      nextRefresh
    }
  }
}