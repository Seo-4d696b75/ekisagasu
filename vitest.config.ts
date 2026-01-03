import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/test/**/*.test.ts'],
          typecheck: {
            tsconfig: 'tsconfig.test.json',
          },
        },
      },
      {
        test: {
          name: 'ui',
          globals: true,
          environment: 'jsdom',
          include: ['src/test/**/*.test.tsx'],
          setupFiles: ['src/test/ui/setup.ts'],
          typecheck: {
            tsconfig: 'tsconfig.test.json',
          },
        },
      },
    ],
  },
}));