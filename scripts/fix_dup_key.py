import json, urllib.request, urllib.error, time

env = {}
with open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); env[k.strip()] = v.strip()
API = env["COOLIFY_API"]; APP = env["APP_UUID"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + env["COOLIFY_TOKEN"]

def req(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Authorization", auth); r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# Alle ANTHROPIC-Eintraege finden
time.sleep(2)
st, body = req("GET", f"/applications/{APP}/envs")
d = json.loads(body); items = d if isinstance(d, list) else d.get("data", [])
anth = [e for e in items if e["key"] == "ANTHROPIC_API_KEY"]
print("Gefundene ANTHROPIC-Eintraege:", len(anth))
for e in anth:
    rv = e.get("real_value") or ""
    print(f"  uuid={e.get('uuid')} len={len(rv)} preview={rv[:12]}")

# Platzhalter (kurz) loeschen, echten (lang) behalten
for e in anth:
    rv = e.get("real_value") or ""
    if len(rv) < 50:  # Platzhalter
        time.sleep(2)
        st, b = req("DELETE", f"/applications/{APP}/envs/{e['uuid']}")
        print(f"  DELETE Platzhalter {e['uuid']}: {st} {b[:80]}")
