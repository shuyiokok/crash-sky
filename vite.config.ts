import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages 项目站：https://用户名.github.io/crash-sky/
export default defineConfig({
  base: '/crash-sky/',
  plugins: [react()],
})
