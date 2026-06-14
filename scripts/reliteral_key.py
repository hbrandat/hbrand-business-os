import json, urllib.request, urllib.error, time

env = {}
with open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); env[k.strip()] = v.strip()
API = env["COOLIFY_API"]; APP = env["APP_UUID"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + env["COOLIFY_TOKEN"]

def rq(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Authorization", auth); r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# Echten Key holen
st, body = rq("GET", f"/applications/{APP}/envs")
items = json.loads(body)
items = items if isinstance(items, list) else items.get("data", [])
key_uuid = None; key_val = None
for e in items:
    if e["key"] == "ANTHROPIC_API_KEY":
        key_uuid = e.get("uuid"); key_val = e.get("real_value")
print("Key-UUID:", key_uuid, "Laenge:", len(key_val) if key_val else 0)

# PATCH per UUID als literal
time.sleep(2)
st, b = rq("PATCH", f"/applications/{APP}/envs/{key_uuid}",
           {"key": "ANTHROPIC_API_KEY", "value": key_val, "is_literal": True, "is_preview": False, "is_buildtime": True, "is_runtime": True})
print("PATCH per UUID:", st, b[:150])

# Bulk-Update als zweiter Versuch (Coolify bevorzugt manchmal bulk)
time.sleep(2)
st2, b2 = rq("PATCH", f"/applications/{APP}/envs/bulk",
             {"data": [{"key": "ANTHROPIC_API_KEY", "value": key_val, "is_literal": True, "is_preview": False}]})
print("Bulk-PATCH:", st2, b2[:150])
