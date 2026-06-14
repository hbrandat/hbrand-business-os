import json, urllib.request, urllib.error

s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]

def rest(path):
    req = urllib.request.Request(url + "/rest/v1/" + path, method="GET")
    req.add_header("apikey", svc); req.add_header("Authorization", "Bearer " + svc)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]

# Test 1: failed Tasks MIT Join (wie im Code)
print("=== MIT Join employees(name) ===")
print(rest("tasks?status=eq.failed&select=id,title,employees(name)"))

# Test 2: OHNE Join
print("\n=== OHNE Join ===")
print(rest("tasks?status=eq.failed&select=id,title,assignee"))
