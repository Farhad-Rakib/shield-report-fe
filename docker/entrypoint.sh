#!/bin/sh
# Runs as part of nginx's /docker-entrypoint.d/ startup hooks, before nginx starts.
# Lets one built image be re-pointed at whatever host:port it's deployed behind
# (e.g. an office LAN IP) via env vars, without rebuilding the frontend.
set -eu

: "${API_BASE_URL:=http://localhost:5000/api/v1}"
: "${CSP_CONNECT_SRC:=}"

envsubst '${API_BASE_URL}' \
  < /usr/share/nginx/html/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js

sed -i "s#__CSP_CONNECT_SRC__#${CSP_CONNECT_SRC}#" /usr/share/nginx/html/index.html
