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

# 远程构建并重启后端。
#
# ⚠️ 执行顺序至关重要：必须先 stop 服务再 mvn package。
#    JVM 惰性加载类：若在进程运行期间原地覆盖 jar，已加载的类还能用，
#    未加载的类（登录、/error 分发等）会抛 NoClassDefFoundError /
#    ClassNotFoundException，且异常发生在写响应阶段 —— 请求线程直接死掉，
#    客户端收到 0 字节并永久挂起（既不是 502 也不报错）。
function Invoke-RemoteBackendBuild {
    param(
        [string]$Server,
        [string]$RemoteProject,
        [string]$BackendService,
        [string]$HealthUrl
    )

    $LoginUrl = $HealthUrl -replace '/health$', '/auth/login'

    # 说明：here-string 中 PowerShell 会把 `$(...)`、`${...}` 当变量插值，
    #       需要原样传给远端 bash 的一律用反引号转义（`$ ），
    #       需要本地展开的（如 ${RemoteProject}）则保持不转义。
    #       反斜杠 `\$` 是错的：它会保留字面反斜杠并让 PowerShell 执行 `$(...)`。
    $remoteCmd = @"
set -e
cd ${RemoteProject}/backend

JAR=${RemoteProject}/backend/target/electronic-medical-record-0.0.1-SNAPSHOT.jar
OLD_PID=`$(systemctl show -p MainPID --value ${BackendService})

echo '>>> [1/5] 停止 ${BackendService}（必须先停，绝不能覆盖正在运行的 jar）'
sudo systemctl stop ${BackendService} || true
for i in `$(seq 1 30); do
  systemctl is-active --quiet ${BackendService} || break
  sleep 1
done

echo '>>> [2/5] 备份当前 jar'
[ -f "`$JAR" ] && sudo cp -f "`$JAR" "`$JAR.bak" || true

echo '>>> [3/5] mvn package -DskipTests'
mvn package -DskipTests

echo '>>> [4/5] 启动 ${BackendService}'
sudo systemctl start ${BackendService}

echo '>>> [5/5] 等待健康检查（最多 120s，冷启动约 60s）'
ok=0
for i in `$(seq 1 60); do
  code=`$(curl -s -o /dev/null -w '%{http_code}' ${HealthUrl} || echo 000)
  if [ "`$code" = "200" ]; then ok=1; echo "health HTTP 200 after `$((i*2))s"; break; fi
  sleep 2
done
if [ "`$ok" != "1" ]; then
  echo 'WARN: 120s 内 health 未返回 200，站点可能暂时 502'
  curl -s -o /dev/null -w 'health HTTP %{http_code}\n' ${HealthUrl} || true
fi

echo '>>> 校验：进程启动时间必须晚于 jar 构建时间（否则跑的是旧 jar）'
NEW_PID=`$(systemctl show -p MainPID --value ${BackendService})
PSTART=`$(date -d "`$(ps -o lstart= -p "`$NEW_PID" 2>/dev/null)" +%s 2>/dev/null || echo 0)
JMTIME=`$(stat -c %Y "`$JAR" 2>/dev/null || echo 0)
if [ "`$PSTART" = "0" ]; then
  echo 'FATAL: 无法读取进程启动时间，部署结果未知'
  exit 1
fi
if [ "`$PSTART" -lt "`$JMTIME" ]; then
  echo "FATAL: 进程启动于 `$PSTART，早于 jar 构建时间 `$JMTIME —— 仍在运行旧 jar！"
  echo "  old_pid=`$OLD_PID new_pid=`$NEW_PID"
  exit 1
fi
echo "OK: pid=`$NEW_PID started=`$PSTART jar_mtime=`$JMTIME （进程晚于 jar）"

echo '>>> 冒烟测试：登录必须快速返回（不能挂起）'
curl -s -m 15 -o /dev/null -w 'login -> HTTP %{http_code} in %{time_total}s\n' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"username":"__deploy_probe__","password":"x"}' ${LoginUrl} || true

sudo systemctl is-active ${BackendService} && echo 'service: active' || echo 'service: inactive'
"@

    ssh $Server $remoteCmd
    if ($LASTEXITCODE -ne 0) {
        throw "Remote build/restart failed (exit $LASTEXITCODE)"
    }
}
