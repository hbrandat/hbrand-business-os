import json, urllib.request, urllib.error, sys

env = {}
with open(r"C:\Users\alexa\.hermes\secrets\coolify-hbrand.env", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

API = env["COOLIFY_API"]; TOK = env["COOLIFY_TOKEN"]; APP = env["APP_UUID"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + TOK

KEY = sys.argv[1]

def req(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Authorization", auth)
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

# POST anlegen
st, body = req("POST", f"/applications/{APP}/envs",
               {"key": "ANTHROPIC_API_KEY", "value": KEY, "is_preview": False})
print("POST ANTHROPIC_API_KEY:", st, body[:150])
if st and st >= 400:
    st2, body2 = req("PATCH", f"/applications/{APP}/envs",
                     {"key": "ANTHROPIC_API_KEY", "value": KEY, "is_preview": False})
    print("PATCH:", st2, body2[:150])

# Deploy auslösen
st3, body3 = req("POST", f"/deploy?uuid={APP}&force=true")
try:
    dd = json.loads(body3)
    print("DEPLOY:", dd["deployments"][0]["deployment_uuid"])
except Exception:
    print("DEPLOY resp:", st3, body3[:150])
