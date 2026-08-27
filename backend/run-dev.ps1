# ================================================
# 本地开发启动脚本（Windows PowerShell）
# 用法：cd backend; .\run-dev.ps1
# 作用：加载 backend/local.env 环境变量后启动 Spring Boot
# ================================================
$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot 'local.env'
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 未找到 $envFile ，请先复制 local.env.example 为 local.env 并填入真实值" -ForegroundColor Red
    exit 1
}

# 解析 KEY=VALUE 格式的环境变量文件（跳过空行与 # 注释）
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -le 0) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    # 去掉首尾引号（与服务器 /opt/emr.env 兼容）
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[$value.Length - 1] -eq '"') -or ($value[0] -eq "'" -and $value[$value.Length - 1] -eq "'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "env:$key" -Value $value
}

Write-Host "✅ 已加载 $envFile ，启动 Spring Boot ..." -ForegroundColor Green
Set-Location $PSScriptRoot
mvn spring-boot:run
