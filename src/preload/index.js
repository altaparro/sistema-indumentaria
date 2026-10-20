import { contextBridge } from 'electron'

const api = {
  getApiBaseUrl: () => process.env.API_BASE_URL || '',
  getAppVersion: () => process.env.npm_package_version || '1.0.0',
  platform: process.platform
}

contextBridge.exposeInMainWorld('indumentaria', api)
