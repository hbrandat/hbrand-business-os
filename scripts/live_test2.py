import json, urllib.request, urllib.error, time

BASE = "https://app.hbrand.at"
s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + svc

def sql(q):
    data = json.dumps({"query": q}).encode()
    req = urllib.request.Request(url + "/pg/query", data=data, method="POST")
    req.add_header("apikey", svc); req.add_header("Authorization", auth); req.add_header("Content-Type","application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

def call(path, payload):
    data = json.dumps(payload).encode()
    r = urllib.request.Request(BASE + path, data=data, method="POST")
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=90) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# Susi-ID holen
susi = sql("select id from employees where key='susi'")[0]["id"]

# 2) Aufgabe fuer Susi anlegen + bearbeiten lassen
print("=== 2) Susi: Angebot erstellen ===")
st, t = call("/api/tasks/action", {"action":"create","employeeKey":"susi",
    "title":"Angebot: Website fuer Elektro Gruber GmbH",
    "brief":"Elektrobetrieb, ~5 Mitarbeiter, Klagenfurt. Braucht moderne Website mit Kontaktformular, Referenzen, Leistungsuebersicht. Budget ca. 3000 EUR. Erstelle ein professionelles Angebot."})
tid = t["task"]["id"]
print("Task erstellt:", tid)

st, r = call("/api/tasks/run", {"taskId": tid})
print("Run HTTP", st)
if isinstance(r, dict):
    print("Status:", r.get("status"), "| Kosten USD:", r.get("cost_usd"))
    print("Ergebnis (Auszug):\n", (r.get("result") or "")[:500])

# 3) Kosten-Tracking pruefen
print("\n=== 3) Kosten-Tracking ===")
jobs = sql("select job_type, model, input_tokens, output_tokens, round(cost_usd::numeric,5) as usd, status from ai_jobs order by created_at desc limit 5")
for j in jobs: print(j)
costs = sql("select month, model, total_input_tokens, total_output_tokens, round(total_cost_usd::numeric,5) usd from api_costs order by month desc limit 3")
print("Monatsaggregat:", costs)
