@echo off
title ILMS - ONLINE QUICK START
cd /d "%~dp0"

set ROOT=%~dp0
set BE=%ROOT%backend
set FE=%ROOT%frontend

echo ============================================
echo  ILMS - MULAI + PUBLISH KE INTERNET (1 klik)
echo ============================================
echo.

echo [0/4] Membersihkan proses lama (bila ada)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Stop-Process -Name 'cloudflared' -Force -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' | Where-Object { $_.CommandLine -like '*ts-node-dev*' -or $_.CommandLine -like '*serve-online*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-CimInstance Win32_Process -Filter 'Name=''cmd.exe''' | Where-Object { $_.CommandLine -like '*npm.cmd run dev*' -or $_.CommandLine -like '*serve-online*' -or $_.CommandLine -like '*tunnel run ilms*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul
echo      Selesai membersihkan.

echo [1/4] Memulai PostgreSQL (Docker)...
docker compose up -d >nul 2>&1

echo [2/4] Memulai Backend API (:5000) ...
start "ILMS Backend" cmd /k "echo ===== ILMS BACKEND (:5000) ===== && cd /d %BE% && npm.cmd run dev"

echo [3/4] Menyiapkan Frontend Online (:4173) ...
if not exist "%FE%\dist\index.html" (
  echo      Membangun frontend, tunggu sebentar...
  pushd "%FE%"
  call npm.cmd run build
  popd
)
start "ILMS Online Server" cmd /k "echo ===== ILMS ONLINE SERVER (:4173) ===== && cd /d %FE% && node serve-online.mjs"

echo [4/4] Menghubungkan Cloudflare Tunnel...
set cf=cloudflared
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" set cf="C:\Program Files (x86)\cloudflared\cloudflared.exe"
if exist "C:\cloudflared\cloudflared.exe" set cf="C:\cloudflared\cloudflared.exe"
start "Cloudflare Tunnel" cmd /k "echo ===== ILMS TUNNEL ===== && cd /d %ROOT% && %cf% tunnel run ilms"

echo.
echo ============================================
echo  JANGAN tutup 3 jendela kecil yang terbuka
echo ============================================
echo  Website:  https://ilms.saiasyap.my.id
echo  Cek lokal: http://localhost:4173/api/health
echo  (tunggu 10-20 detik lalu buka websitenya)
echo ============================================
echo.
echo  Memeriksa status...
timeout /t 6 /nobreak >nul
powershell -NoProfile -Command "$p5=(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue)|Select -First 1; $p4=(Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue)|Select -First 1; Write-Host ('  Backend  :5000 -> ' + $(if($p5){'AKTIF'}else{'MATI'})); Write-Host ('  Online   :4173 -> ' + $(if($p4){'AKTIF'}else{'MATI'}))"
pause