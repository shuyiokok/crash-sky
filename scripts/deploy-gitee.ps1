# 一键部署到 Gitee Pages（会提示登录 Gitee）
# 用法：在项目根目录执行  powershell -ExecutionPolicy Bypass -File .\scripts\deploy-gitee.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> build"
npm run build

$branch = "gh-pages"
$tmp = Join-Path $env:TEMP "crash-sky-gh-pages"

if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item -Recurse -Force .\dist\* $tmp

Push-Location $tmp
git init -b $branch
git add .
git commit -m "Deploy Gitee Pages"
git remote add origin https://gitee.com/shuyiokok/crash-sky.git
Write-Host "==> push gh-pages (请在弹出窗口登录 Gitee)"
git push -f origin "${branch}:${branch}"
Pop-Location

Write-Host ""
Write-Host "推送完成后，打开仓库页："
Write-Host "  https://gitee.com/shuyiokok/crash-sky"
Write-Host "服务 -> Gitee Pages -> 部署分支选 gh-pages，目录选 / ，启动"
Write-Host "访问地址："
Write-Host "  https://shuyiokok.gitee.io/crash-sky"
