import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Gitee Pages 项目站路径：https://用户名.gitee.io/crash-sky/
export default defineConfig({
  base: '/crash-sky/',
  plugins: [react()],
})
