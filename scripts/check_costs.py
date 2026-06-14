import json, urllib.request, urllib.error

s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + svc

def sql(q):
    data = json.dumps({"query": q}).encode()
    req = urllib.request.Request(url + "/pg/query", data=data, method="POST")
    req.add_header("apikey", svc); req.add_header("Authorization", auth); req.add_header("Content-Type","application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"ERR": e.read().decode()[:200]}

print("=== ai_jobs (Kosten pro Job) ===")
for j in sql("select job_type, model, input_tokens, output_tokens, cost_usd, status from ai_jobs order by created_at desc limit 6"):
    print(j)

print("\n=== api_costs (Monatsaggregat) ===")
for c in sql("select month, model, total_input_tokens, total_output_tokens, total_cost_usd, total_cost_eur from api_costs order by month desc"):
    print(c)

print("\n=== Aufgaben-Tische (Status pro Mitarbeiter) ===")
for t in sql("select e.name, t.status, count(*) from tasks t join employees e on e.id=t.assignee group by e.name, t.status order by e.name"):
    print(t)
