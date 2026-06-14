import json, urllib.request, urllib.error, sys

KEY = sys.argv[1]
req = urllib.request.Request("https://api.anthropic.com/v1/models")
req.add_header("x-api-key", KEY)
req.add_header("anthropic-version", "2023-06-01")
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    for m in d.get("data", []):
        print(m.get("id"))
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:300])
except Exception as e:
    print("err", e)
