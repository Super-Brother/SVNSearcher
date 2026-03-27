import { API } from '../../../src/preload/index'

declare global {
  interface Window {
    api: API
  }
}

export {}