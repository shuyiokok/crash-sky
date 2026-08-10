# 部署到 GitHub Pages（推送到 origin 的 gh-pages 分支）
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\deploy-github-pages.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> build"
npm run build

$branch = "gh-pages"
$tmp = Join-Path $env:TEMP "crash-sky-github-pages"

if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item -Recurse -Force .\dist\* $tmp

# SPA 在 GitHub Pages 上刷新子路径会 404；本项目无路由，无需 404.html
# 加 .nojekyll 避免 Jekyll 忽略以下划线开头的资源
New-Item -ItemType File -Path (Join-Path $tmp ".nojekyll") -Force | Out-Null

Push-Location $tmp
git init -b $branch
git add .
git -c user.name="shuyiokok" -c user.email="shuyiokok@users.noreply.github.com" commit -m "Deploy GitHub Pages"
git remote add origin https://github.com/shuyiokok/crash-sky.git
Write-Host "==> push gh-pages"
git push -f origin "${branch}:${branch}"
Pop-Location

Write-Host ""
Write-Host "完成后访问："
Write-Host "  https://shuyiokok.github.io/crash-sky/"
