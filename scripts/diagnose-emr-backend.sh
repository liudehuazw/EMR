#!/bin/bash
# 502 登录失败时在服务器运行: bash scripts/diagnose-emr-backend.sh
echo "=== emr-backend systemd ==="
systemctl is-active emr-backend 2>&1 || true
systemctl status emr-backend --no-pager -l 2>&1 | head -20 || true
echo ""
echo "=== last 40 log lines ==="
journalctl -u emr-backend -n 40 --no-pager 2>&1 || true
echo ""
echo "=== health checks ==="
curl -s -o /dev/null -w "127.0.0.1:8080 /api/health -> HTTP %{http_code}\n" http://127.0.0.1:8080/api/health || echo "8080 unreachable"
curl -s -o /dev/null -w "127.0.0.1:8088 /api/health -> HTTP %{http_code}\n" http://127.0.0.1:8088/api/health || echo "8088 unreachable"
echo ""
echo "=== login smoke (local) ==="
curl -s -o /dev/null -w "POST /api/auth/login (empty body) -> HTTP %{http_code}\n" -X POST http://127.0.0.1:8080/api/auth/login -H 'Content-Type: application/json' -d '{}' || true
echo ""
echo "=== jar ==="
ls -la backend/target/*.jar 2>&1 | tail -3 || true
echo ""
echo "=== port 8080 listen ==="
ss -lntp 2>/dev/null | grep ':8080' || netstat -lntp 2>/dev/null | grep ':8080' || echo "nothing on 8080"
