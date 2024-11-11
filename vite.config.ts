import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import env from "vite-plugin-env-compatible";

// copy from https://zenn.dev/xronotech/articles/11e671bf0315e7
export default defineConfig({
  server: {
    open: true, // 自動でブラウザを開く
    port: 3000, // ここでポート番号を指定します
  },
  build: {
    outDir: 'build', // ビルドの出力先ディレクトリ
  },
  plugins: [
    react(),
    env({
      prefix: 'VITE',
      mountedPath: 'process.env',
    })
  ],
});