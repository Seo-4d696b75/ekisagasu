/// <reference types="react-scripts" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_KEY: string
      REACT_APP_RADAR_MIN: number
      REACT_APP_RADAR_MAX: number
      REACT_APP_DATA_BASE_URL: string
      REACT_APP_DATA_EXTRA_BASE_URL: string
      REACT_APP_PREFECTURE_URL: string
      REACT_APP_STATION_API_URL: string
      NODE_ENV: 'development' | 'production'
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}