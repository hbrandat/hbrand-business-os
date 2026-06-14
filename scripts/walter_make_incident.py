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

# Walter-ID holen
w = sql("select id from employees where key='walter'")
wid = w[0]["id"]
print("Walter:", wid)

# Kuenstliche gescheiterte Test-Aufgabe anlegen
sql("""insert into tasks (assignee, title, brief, status, needs_approval, error, started_at, finished_at)
values ('%s', '[TEST] Kaputte Aufgabe', 'Test-Vorfall fuer Walter', 'failed', false,
'Simulierter Fehler: Anthropic 500 Timeout', now() - interval '5 min', now() - interval '4 min')""" % wid)
print("Test-failed-Task angelegt")

# Kontrolle
r = sql("select count(*) as n from tasks where status='failed' and title like '[TEST]%'")
print("Failed Test-Tasks:", r)
