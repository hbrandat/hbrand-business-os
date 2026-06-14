#!/usr/bin/env bash
set -e
TOKEN=$(grep '^COOLIFY_TOKEN=' ~/.hermes/secrets/coolify-hbrand.env | cut -d= -f2- | tr -d '"'\''\r\n ')
DUUID="mtdcyts7a95z00ht0r60o4fk"
curl -s "https://coolify.hbrand.at/api/v1/deployments/$DUUID" \
  -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json; d=json.load(sys.stdin); print('deploy status:', d.get('status'))"
