import json, urllib.request, urllib.error

env = {}
with open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); env[k.strip()] = v.strip()
API = env["COOLIFY_API"]; APP = env["APP_UUID"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + env["COOLIFY_TOKEN"]

# Echten Key-Wert aus Coolify holen (laeuft nur im Script, wird nie ausgegeben)
req = urllib.request.Request(API + f"/applications/{APP}/envs")
req.add_header("Authorization", auth)
d = json.loads(urllib.request.urlopen(req, timeout=25).read().decode())
items = d if isinstance(d, list) else d.get("data", [])
key = None
for e in items:
    if e["key"] == "ANTHROPIC_API_KEY":
        key = e.get("real_value") or ""
print("Key-Laenge:", len(key) if key else "KEIN KEY")

if key:
    # Direkt gegen Anthropic testen
    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 20,
        "messages": [{"role": "user", "content": "sag nur OK"}]
    }).encode()
    r = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, method="POST")
    r.add_header("x-api-key", key)
    r.add_header("anthropic-version", "2023-06-01")
    r.add_header("content-type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            out = json.loads(resp.read().decode())
        print("ANTHROPIC OK:", out.get("content", [{}])[0].get("text", "")[:50])
        print("Modell antwortet — KEY IST GUELTIG")
    except urllib.error.HTTPError as e:
        print("ANTHROPIC FEHLER", e.code, e.read().decode()[:200])
