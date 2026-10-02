# 部署公共配置（被其它 deploy-*.ps1 引用）
# 按需修改服务器账号、路径（勿提交真实密钥与生产 IP）

$script:DeployConfig = @{
    Server            = "user@your-server"
    RemoteProject     = "/opt/emr"
    BackendService    = "emr-backend"
    RemoteEnvFile     = "/opt/emr.env"
    DbName            = "emr_db"
    HealthUrl         = "http://127.0.0.1:8080/api/health"
    FrontendRemoteDir = "/var/www/html"
    SiteUrl           = "https://your-domain.example"
}

function Get-DeployConfig { $script:DeployConfig }

function Get-ProjectRoot {
    Split-Path $PSScriptRoot -Parent
}

function Invoke-RemoteBackendBuild {
    param(
        [string]$Server,
        [string]$RemoteProject,
        [string]$BackendService,
        [string]$HealthUrl
    )

    $remoteCmd = @"
set -e
cd ${RemoteProject}/backend
echo '>>> mvn package -DskipTests'
mvn package -DskipTests
echo '>>> systemctl restart ${BackendService}'
sudo systemctl restart ${BackendService}
echo '>>> waiting for Spring Boot (up to 120s, prod cold start ~60s)...'
ok=0
for i in \$(seq 1 60); do
  code=\$(curl -s -o /dev/null -w '%{http_code}' ${HealthUrl} || echo 000)
  if [ "\$code" = "200" ]; then ok=1; echo "health HTTP 200 after \$((i*2))s"; break; fi
  sleep 2
done
if [ "\$ok" != "1" ]; then
  echo 'WARN: health not 200 within 120s — site may return 502 until startup completes'
  curl -s -o /dev/null -w 'health HTTP %{http_code}\n' ${HealthUrl} || true
fi
sudo systemctl is-active ${BackendService} && echo 'service: active' || echo 'service: inactive'
"@

    ssh $Server $remoteCmd
    if ($LASTEXITCODE -ne 0) {
        throw "Remote build/restart failed (exit $LASTEXITCODE)"
    }
}
