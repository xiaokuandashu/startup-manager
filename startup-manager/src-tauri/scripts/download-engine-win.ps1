# Download llama.cpp Windows CPU engine to binaries directory
# Run before building: powershell -ExecutionPolicy Bypass -File src-tauri/scripts/download-engine-win.ps1

$ErrorActionPreference = "Stop"

$binDir = Join-Path (Join-Path $PSScriptRoot "..") "binaries"
$engineExe = Join-Path $binDir "llama-server-x86_64-pc-windows-msvc.exe"

if (Test-Path $engineExe) {
    Write-Host "[OK] Engine files already exist, skipping download" -ForegroundColor Green
    exit 0
}

Write-Host "[DOWNLOAD] Downloading llama.cpp Windows CPU engine..." -ForegroundColor Cyan

$zipUrl = "https://ghfast.top/https://github.com/ggml-org/llama.cpp/releases/download/b8400/llama-b8400-bin-win-cpu-x64.zip"
$zipPath = Join-Path $binDir "llama-engine.zip"

New-Item -ItemType Directory -Force -Path $binDir | Out-Null

Write-Host "URL: $zipUrl"
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "[EXTRACT] Extracting files..."

$tempDir = Join-Path $binDir "_temp_engine"
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

$neededFiles = @(
    "llama-server.exe",
    "ggml.dll",
    "ggml-base.dll",
    "ggml-cpu.dll",
    "ggml-rpc.dll",
    "llama.dll"
)

foreach ($fileName in $neededFiles) {
    $found = Get-ChildItem -Path $tempDir -Recurse -Filter $fileName | Select-Object -First 1
    if ($found) {
        if ($fileName -eq "llama-server.exe") {
            Copy-Item $found.FullName -Destination $engineExe
            Write-Host "  [OK] $fileName -> llama-server-x86_64-pc-windows-msvc.exe" -ForegroundColor Green
        } else {
            Copy-Item $found.FullName -Destination (Join-Path $binDir $fileName)
            Write-Host "  [OK] $fileName" -ForegroundColor Green
        }
    } else {
        Write-Host "  [WARN] Not found: $fileName" -ForegroundColor Yellow
    }
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[DONE] Engine downloaded. Run 'npm run tauri build' now." -ForegroundColor Green
