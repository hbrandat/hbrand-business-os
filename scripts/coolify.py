import json, urllib.request, urllib.error, sys

# Token aus env-Datei lesen (Zeile fuer Zeile, kein Regex)
tok = None
for line in open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8"):
    line = line.strip()
    if line.startswith("COOLIFY_TOKEN="):
        tok = line.split("=", 1)[1].strip().strip('"').strip("'")
        break

UUID = "lim550lh5lsokut5e6pmttan"
BASE = "https://coolify.hbrand.at/api/v1"

def api(path, method="GET"):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Authorization", "Bearer " + tok)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"ERR": e.code, "body": e.read().decode()[:200]}

action = sys.argv[1] if len(sys.argv) > 1 else "deploy"

if action == "deploy":
    r = api("/deploy?uuid=" + UUID + "&force=true", "POST")
    dep = r.get("deployments", [{}])[0] if "deployments" in r else r
    print("DEPLOY:", json.dumps(dep))
elif action.startswith("status:"):
    duuid = action.split(":", 1)[1]
    r = api("/deployments/" + duuid)
    print("STATUS:", r.get("status", r))
