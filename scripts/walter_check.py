import json, urllib.request, urllib.error

s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]
auth = "Bearer " + svc

def sql(q):
    data = json.dumps({"query": q}).encode()
    req = urllib.request.Request(url + "/pg/query", data=data, method="POST")
    req.add_header("apikey", svc); req.add_header("Authorization", auth); req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"ERR": e.read().decode()[:300]}

print("=== Alle failed Tasks ===")
for t in sql("select id, title, status, error, metadata, assignee from tasks where status='failed'"):
    print(t)

print("\n=== Walter-Report-Tasks (needs_chef von Walter) ===")
for t in sql("select id, title, status, metadata from tasks where metadata->>'walter_report' = 'true'"):
    print(t)
