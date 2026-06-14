import json, urllib.request, urllib.error, time

BASE = "https://app.hbrand.at"

def call(path, payload):
    data = json.dumps(payload).encode()
    r = urllib.request.Request(BASE + path, data=data, method="POST")
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=90) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

# 1) Intake-Test: simulierte Website-Anfrage -> Dispatcher wertet aus
print("=== 1) Website-Anfrage an Dispatcher ===")
st, body = call("/api/intake", {
    "name": "Hans Gruber",
    "email": "hans@elektro-gruber.at",
    "company": "Elektro Gruber GmbH",
    "message": "Hallo, ich brauche eine neue Website fuer meinen Elektrobetrieb und jemanden der mir hilft meine Auftraege zu verwalten. Habt ihr da was?",
    "source": "test"
})
print("HTTP", st)
try:
    d = json.loads(body)
    print("Task-ID:", d.get("taskId"))
    print("Analyse:\n", (d.get("analysis") or "")[:600])
except Exception:
    print(body[:400])
