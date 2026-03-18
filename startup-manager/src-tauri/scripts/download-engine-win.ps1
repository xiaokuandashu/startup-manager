# 下载 llama.cpp Windows CPU 引擎到 binaries 目录
# 打包前运行此脚本: powershell -ExecutionPolicy Bypass -File scripts/download-engine-win.ps1

$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot ".." "binaries"
$engineExe = Join-Path $binDir "llama-server-x86_64-pc-windows-msvc.exe"

# 如果引擎已存在则跳过
if (Test-Path $engineExe) {
    Write-Host "✅ 引擎文件已存在，跳过下载" -ForegroundColor Green
    exit 0
}

Write-Host "⬇️  正在下载 llama.cpp Windows CPU 引擎..." -ForegroundColor Cyan

$zipUrl = "https://ghfast.top/https://github.com/ggml-org/llama.cpp/releases/download/b8400/llama-b8400-bin-win-cpu-x64.zip"
$zipPath = Join-Path $binDir "llama-engine.zip"

# 创建目录
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# 下载
Write-Host "📦 下载地址: $zipUrl"
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "📂 正在解压..."

# 解压到临时目录
$tempDir = Join-Path $binDir "_temp_engine"
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

# 需要的文件
$neededFiles = @(
    "llama-server.exe",
    "ggml.dll",
    "ggml-base.dll", 
    "ggml-cpu.dll",
    "ggml-rpc.dll",
    "llama.dll"
)

# 递归搜索并复制
foreach ($fileName in $neededFiles) {
    $found = Get-ChildItem -Path $tempDir -Recurse -Filter $fileName | Select-Object -First 1
    if ($found) {
        if ($fileName -eq "llama-server.exe") {
            # 重命名为 Tauri externalBin 格式
            Copy-Item $found.FullName -Destination $engineExe
            Write-Host "  ✅ $fileName -> llama-server-x86_64-pc-windows-msvc.exe"
        } else {
            Copy-Item $found.FullName -Destination (Join-Path $binDir $fileName)
            Write-Host "  ✅ $fileName"
        }
    } else {
        Write-Host "  ⚠️  未找到: $fileName" -ForegroundColor Yellow
    }
}

# 清理
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 引擎文件下载完成！可以运行 npm run tauri build 打包了" -ForegroundColor Green
