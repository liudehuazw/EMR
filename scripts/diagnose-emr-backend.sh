#!/bin/bash
# emr-backend 诊断脚本
# 用法（在生产服务器上执行）：
#   bash /opt/Electronic-medical-record/scripts/diagnose-emr-backend.sh
#
# 重点覆盖两类历史故障：
#   1) 「进程未重启但 jar 已被覆盖」→ 未加载的类抛 NoClassDefFoundError/ClassNotFoundException，
#      请求线程带未捕获 Error 直接死亡，客户端收到 0 字节并永久挂起（既非 502 也不报错）。
#   2) 内存 / Redis / DB 连接池耗尽等资源类故障。

JAR=/opt/Electronic-medical-record/backend/target/electronic-medical-record-0.0.1-SNAPSHOT.jar

echo "=== emr-backend systemd ==="
systemctl is-active emr-backend 2>&1 || true
systemctl status emr-backend --no-pager -l 2>&1 | head -20 || true
echo ""

echo "=== 进程 vs jar 时间（最关键：进程必须晚于 jar）==="
PID=$(systemctl show -p MainPID --value emr-backend 2>/dev/null)
if [ -n "$PID" ] && [ "$PID" != "0" ]; then
  echo "MainPID   : $PID"
  echo "进程启动  : $(ps -o lstart= -p "$PID" 2>/dev/null)"
  echo "JVM 参数  : $(tr '\0' ' ' < /proc/$PID/cmdline 2>/dev/null)"
else
  echo "MainPID   : 未取到（服务可能未运行）"
fi
if [ -f "$JAR" ]; then
  echo "jar 时间  : $(stat -c '%y' "$JAR" 2>/dev/null)"
else
  echo "jar 时间  : jar 不存在！"
fi
echo ""

echo "=== 类加载失败（jar 被覆盖的典型症状）==="
journalctl -u emr-backend -n 300 --no-pager 2>/dev/null \
  | grep -E 'NoClassDefFoundError|ClassNotFoundException|Exception in thread "http-nio' \
  | tail -15 || true
echo ""

echo "=== 最近日志 ==="
journalctl -u emr-backend -n 40 --no-pager 2>&1 || true
echo ""

echo "=== 健康 / 业务接口（注意 time_total，不能挂起）==="
curl -s -o /dev/null -w "127.0.0.1:8080 /api/health   -> HTTP %{http_code}  %{time_total}s\n" -m 10 http://127.0.0.1:8080/api/health || echo "8080 unreachable"
curl -s -o /dev/null -w "127.0.0.1:8088 /api/health   -> HTTP %{http_code}  %{time_total}s\n" -m 10 http://127.0.0.1:8088/api/health || echo "8088 unreachable"
echo ""
echo "=== 登录冒烟（必须秒回，挂起即异常）==="
curl -s -o /dev/null -w "POST /api/auth/login (empty body) -> HTTP %{http_code}  %{time_total}s\n" -m 15 \
  -X POST http://127.0.0.1:8080/api/auth/login -H 'Content-Type: application/json' -d '{}' || true
echo ""
echo "=== 错误分发路径（jar 被覆盖时这里也会挂死）==="
curl -s -o /dev/null -w "GET /api/__nonexistent__ -> HTTP %{http_code}  %{time_total}s\n" -m 10 \
  http://127.0.0.1:8080/api/__nonexistent__ || true
echo ""

echo "=== jar ==="
ls -la /opt/Electronic-medical-record/backend/target/*.jar 2>&1 | tail -3 || true
echo ""

echo "=== port 8080 listen ==="
ss -lntp 2>/dev/null | grep ':8080' || netstat -lntp 2>/dev/null | grep ':8080' || echo "nothing on 8080"
echo ""

echo "=== 内存 / swap ==="
free -h 2>/dev/null || true
echo ""
echo "=== 容器占用 ==="
docker stats --no-stream 2>/dev/null || true
echo ""
echo "=== 占用最高的进程 ==="
ps -eo pid,rss,comm --sort=-rss 2>/dev/null | head -10 || true
