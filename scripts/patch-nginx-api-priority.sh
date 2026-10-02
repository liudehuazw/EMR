#!/bin/bash
# 宝塔站点：确保 /api/ 优先于 *.pdf 等静态正则，避免本地预览 404
CONF="${1:-/www/server/panel/vhost/nginx/emr.liudehuazw.cn.conf}"
if [ ! -f "$CONF" ]; then
  echo "Config not found: $CONF"
  exit 1
fi
if grep -q 'location \^~ /api/' "$CONF"; then
  echo "Already patched: ^~ /api/"
else
  sed -i 's/location \/api\//location ^~ \/api\//g' "$CONF"
  echo "Patched location ^~ /api/ in $CONF"
fi
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
echo "Nginx reloaded OK"
