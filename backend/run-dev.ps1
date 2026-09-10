# ================================================
# 本地开发启动脚本（Windows PowerShell）
# ================================================
# 用法：
#   .\run-dev.ps1                连 MySQL（需先复制 local.env.example 为 local.env 并填值）
#   .\run-dev.ps1 -Profile dev   零配置启动：H2 内存数据库，无需 MySQL，数据重启即清空
#   .\run-dev.ps1 -Profile prod  使用 application-prod.yml（需要完整环境变量）
# ================================================
param(
    [string]$Profile = ''
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ---- 加载 local.env（存在则加载，不存在时视 profile 决定是否报错）----
$envFile = Join-Path $PSScriptRoot 'local.env'
if (Test-Path $envFile) {
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
    Write-Host "✅ 已加载 $envFile" -ForegroundColor Green
}
elseif ([string]::IsNullOrWhiteSpace($Profile)) {
    Write-Host "❌ 未找到 $envFile" -ForegroundColor Red
    Write-Host "   · 想连本地 MySQL：复制 local.env.example 为 local.env 并填入真实值" -ForegroundColor Yellow
    Write-Host "   · 想零配置试用：  改用 .\run-dev.ps1 -Profile dev（H2 内存库，无需 MySQL）" -ForegroundColor Yellow
    exit 1
}

# ---- 启动 ----
if ([string]::IsNullOrWhiteSpace($Profile)) {
    Write-Host "▶ 启动 Spring Boot（默认 profile，数据库取自 local.env）..." -ForegroundColor Cyan
} else {
    $env:SPRING_PROFILES_ACTIVE = $Profile
    Write-Host "▶ 启动 Spring Boot（SPRING_PROFILES_ACTIVE=$Profile）..." -ForegroundColor Cyan
    if ($Profile -eq 'dev') {
        Write-Host "   使用 H2 内存数据库（数据仅在本次运行期间存在）" -ForegroundColor DarkGray
    }
}

mvn spring-boot:run
