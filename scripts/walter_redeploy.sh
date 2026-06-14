#!/usr/bin/env bash
set -e
TOKEN=*** '^COOLIFY_TOKEN=*** ~/.hermes/secrets/coolify-hbrand.env | cut -d= -f2- | tr -d '"'\''\r\n ')
UUID="lim550lh5lsokut5e6pmttan"
curl -s -X POST "https://coolify.hbrand.at/api/v1/deploy?uuid=$UUID&force=true" \
  -H "Authorization: Bearer *** | python -c "import sys,json; d=json.load(sys.stdin); dep=d.get('deployments',[{}])[0]; print('queued:', dep.get('deployment_uuid'))"
