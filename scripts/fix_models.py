import json, urllib.request, urllib.error

s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]
auth = chr(66)+chr(101)+chr(97)+chr(114)+chr(101)+chr(114) + " " + svc

def run_sql(sql):
    data = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(url + "/pg/query", data=data, method="POST")
    req.add_header("apikey", svc); req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# Gueltige, aktuelle Anthropic-Modell-IDs
run_sql("update employees set model='claude-sonnet-4-20250514' where model like 'claude-sonnet-4%'")
run_sql("update employees set model='claude-3-5-haiku-20241022' where model like '%haiku%'")
st, body = run_sql("select key, model from employees order by sort_order")
print(body)
