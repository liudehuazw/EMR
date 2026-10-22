#!/bin/bash
# 为宝塔站点开启 gzip（可选 brotli）压缩。
#
# 背景：生产环境实测 /assets/vendor-element-*.js 为 1.06MB、index.css 为 375KB，
# 且响应头无 Content-Encoding，即 nginx 未开启压缩，全部按原始体积传输。
# 外网/移动网络下这直接导致首页加载缓慢。
# gzip 后可降至约 1/3（实测 1.24MB JS -> 405KB）。
#
# 用法（在服务器上执行）：
#   bash patch-nginx-compression.sh [conf路径]
# 不传参时自动查找宝塔 vhost 目录下的第一个 .conf
set -e

if [ -n "$1" ]; then
  CONF="$1"
else
  CONF=$(ls /www/server/panel/vhost/nginx/*.conf 2>/dev/null | head -1)
fi

if [ -z "$CONF" ] || [ ! -f "$CONF" ]; then
  echo "Config not found. 用法: $0 [站点conf路径]" >&2
  exit 1
fi

if grep -qE '^\s*gzip\s+on\s*;' "$CONF"; then
  echo "Already enabled: gzip on;  ($CONF)"
else
  cp -a "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"
  echo "Backup created."

  # 在 server_name 行之后插入压缩配置（保持在 server 块内部）
  awk '
    { print }
    /^[[:space:]]*server_name[[:space:]]/ && !done {
      print "";
      print "    # === 静态资源压缩（由 patch-nginx-compression.sh 添加）===";
      print "    gzip on;";
      print "    gzip_vary on;";
      print "    gzip_comp_level 6;";
      print "    gzip_min_length 1024;";
      print "    gzip_proxied any;";
      print "    gzip_types text/plain text/css text/xml application/json application/javascript";
      print "               application/xml application/xml+rss image/svg+xml application/wasm;";
      done = 1;
    }
  ' "$CONF" > "${CONF}.new" && mv "${CONF}.new" "$CONF"

  echo "Patched gzip in $CONF"
fi

# brotli 为可选：仅当 nginx 编译了该模块时启用（压缩率通常再优于 gzip 15%~20%）
if /www/server/nginx/sbin/nginx -V 2>&1 | grep -q 'brotli'; then
  if grep -qE '^\s*brotli\s+on\s*;' "$CONF"; then
    echo "Already enabled: brotli on;"
  else
    awk '
      { print }
      /^[[:space:]]*gzip_types/ && !bdone {
        print "    brotli on;";
        print "    brotli_comp_level 5;";
        print "    brotli_min_length 1024;";
        print "    brotli_types text/plain text/css application/json application/javascript application/xml image/svg+xml;";
        bdone = 1;
      }
    ' "$CONF" > "${CONF}.new" && mv "${CONF}.new" "$CONF"
    echo "Patched brotli in $CONF"
  fi
else
  echo "Skip brotli: nginx 未编译 brotli 模块（不影响 gzip 生效）"
fi

/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
echo "Nginx reloaded OK"
echo
echo "验证："
echo "  curl -sI -H 'Accept-Encoding: gzip' https://<你的域名>/assets/vendor-element-*.js | grep -i content-encoding"
