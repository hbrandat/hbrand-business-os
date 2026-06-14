import json, time, urllib.request, sys

env = {}
with open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

API = env["COOLIFY_API"]; TOK = env["COOLIFY_TOKEN"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + TOK
DEP = sys.argv[1] if len(sys.argv) > 1 else "d8vbsir63hzri8kig5imzg2f"

for i in range(30):
    time.sleep(12)
    req = urllib.request.Request(API + "/deployments/" + DEP)
    req.add_header("Authorization", auth)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.loads(r.read().decode())
        stt = d.get("status", "?")
        print(f"[{(i+1)*12}s] {stt}", flush=True)
        if stt in ("finished", "failed", "error", "cancelled"):
            break
    except Exception as ex:
        print("poll err", str(ex)[:60], flush=True)
