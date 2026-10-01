# ============================================================
#  start-online.ps1 - ILMS Online Launcher
#  Menyalakan backend + frontend produksi agar siap di-tunnel
#  via Cloudflare Tunnel. Jalankan di PowerShell:
#      powershell -ExecutionPolicy Bypass -File .\start-online.ps1
# ============================================================
$ErrorActionPreference = 'Continue'
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BE   = Join-Path $ROOT 'backend'
$FE   = Join-Path $ROOT 'frontend'
$DIST = Join-Path $FE 'dist'

Write-Host '=== ILMS Online Launcher ===' -ForegroundColor Cyan

# 1) Pastikan PostgreSQL (Docker) hidup
$pg = docker ps --filter "name=ilms_postgres" --format "{{.Names}}" 2>$null
if (-not $pg) {
  Write-Host '[1/3] Memulai PostgreSQL (Docker)...' -ForegroundColor Yellow
  docker compose -f (Join-Path $ROOT 'docker-compose.yml') up -d
  Start-Sleep -Seconds 5
} else {
  Write-Host '[1/3] PostgreSQL sudah berjalan.' -ForegroundColor Green
}

# 2) Backend API :5000
Write-Host '[2/3] Menyalakan Backend API (port 5000)...' -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList '/k', "cd /d ``"$BE``" && npm.cmd run dev"
Start-Sleep -Seconds 2

# 3) Frontend produksi :4173 + proxy /api -> :5000 (server Node sendiri)
if (-not (Test-Path (Join-Path $DIST 'index.html'))) {
  Write-Host '      Membangun frontend (npm run build)...' -ForegroundColor Yellow
  Push-Location $FE
  npm.cmd run build
  Pop-Location
}
Write-Host '[3/3] Menyalakan Online Server (node serve-online.mjs :4173)...' -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList '/k', "cd /d ``"$FE``" && node serve-online.mjs"

Write-Host ''
Write-Host 'Lokal  : http://localhost:4173' -ForegroundColor Green
Write-Host 'Health : http://localhost:4173/api/health' -ForegroundColor Green
Write-Host ''
Write-Host 'Untuk akses internet, jalankan di terminal lain:' -ForegroundColor Cyan
Write-Host '   cloudflared tunnel run ilms' -ForegroundColor Cyan
Write-Host '   lalu buka https://ilms.<domainAnda>.com' -ForegroundColor Cyan
Write-Host ''