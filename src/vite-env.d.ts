/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_API_KEY: string
      VITE_RADAR_MIN: number
      VITE_RADAR_MAX: number
      VITE_DATA_BASE_URL: string
      VITE_STATION_API_URL: string
      NODE_ENV: 'development' | 'production'
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export { }
