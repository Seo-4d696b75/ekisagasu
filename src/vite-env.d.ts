/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_RADAR_MIN: number
  readonly VITE_RADAR_MAX: number
  readonly VITE_DATA_BASE_URL: string
  readonly VITE_STATION_API_URL: string
  readonly NODE_ENV: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
