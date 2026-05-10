import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // ── 인증 / 사용자 (user-service :8082) ───────────────────────────
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ── 대회 (competition-service :8092) ───────────────────────────
      '/api/competitions': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ── 랭킹 (ranking-service :8094) ───────────────────────────────
      '/api/rankings': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ── 거래 / 시세 / 종목 / 장 상태 (trade-service :8084) ────────
      '/api/trades': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ── 자산 / 계좌 / 보유 종목 (asset-service :8086) ─────────────
      '/api/accounts': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/assets': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/holdings': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ── STOMP WebSocket ────────────────────────────────────────────
      '/ws-stomp': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
