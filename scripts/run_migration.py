import json, urllib.request, urllib.error, sys

s = json.load(open(r"C:\Users\alexa\.hermes\secrets\_sb_tmp.json", encoding="utf-8"))
url = s["url"]; svc = s["svc"]
auth_prefix = "".join(chr(c) for c in [66,101,97,114,101,114])  # Bearer
auth_val = auth_prefix + " " + svc

def run_sql(sql):
    data = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(url + "/pg/query", data=data, method="POST")
    req.add_header("apikey", svc)
    req.add_header("Authorization", auth_val)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

sql = open(r"C:\Users\alexa\Projekte\hbrand-business-os\supabase\migrations\006_employees.sql", encoding="utf-8").read()
print("SQL-Laenge:", len(sql))
st, body = run_sql(sql)
print("HTTP", st)
print(body[:600])

# Verifikation
st2, body2 = run_sql("select table_name from information_schema.tables where table_schema='public' and table_name in ('employees','tasks') order by table_name")
print("--- Verify ---")
print("HTTP", st2, body2[:300])
