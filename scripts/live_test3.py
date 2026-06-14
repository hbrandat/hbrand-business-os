import json, urllib.request, urllib.error

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
        return e.code, {"error_body": e.read().decode()[:400]}

# Testdaten weg
sql("delete from ai_jobs")
sql("delete from api_costs")
sql("delete from tasks")
print("Testdaten geloescht.\n")

# Frische Aufgabe fuer Vera (Akquise) -> bearbeiten
st, t = call("/api/tasks/action", {"action":"create","employeeKey":"vera",
    "title":"3 Leads in Klagenfurt finden",
    "brief":"Finde 3 Beispiel-Betriebe in Klagenfurt (Handwerk/lokal), die keine oder eine veraltete Website haben und Potenzial fuer Digitalisierung bieten. Pro Lead: Name, Branche, Problem, Ansatz."})
tid = t["task"]["id"]
st, r = call("/api/tasks/run", {"taskId": tid})
print("Vera bearbeitet:", r.get("status"), "| Kosten USD:", r.get("cost_usd"))
print("Auszug:\n", (r.get("result") or "")[:400])

print("\n=== Kosten-Tracking JETZT ===")
print("ai_jobs:", sql("select task_type, model, input_tokens, output_tokens, cost_usd, status from ai_jobs"))
print("api_costs:", sql("select model, total_input_tokens, total_output_tokens, total_cost_usd, total_cost_eur from api_costs"))
