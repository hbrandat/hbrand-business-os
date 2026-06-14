# HBrand.at — KI-Team Betriebssystem (Konzept)

> Ziel: Eine ganze Agentur als Dashboard. Benannte KI-Mitarbeiter mit eigenem
> Aufgabentisch setzen Kundenprojekte um — von der Website-Anfrage bis zur Rechnung.
> Der Chef (Alexander) ist der EINZIGE Kundenkontakt und gibt jedes Tor nach außen frei.

## OBERSTE REGEL
Nichts verlässt die Firma Richtung Kunde ohne ausdrückliche Freigabe des Chefs.
KI macht Vorarbeit + Entwürfe. Alexander entscheidet alles, was nach außen wirkt.

## DAS TEAM (Org-Chart) — 10 Mitarbeiter

### 🟦 DISPATCHER ("Empfang/Leitstand") — der Orchestrator
- Empfängt JEDE eingehende Anfrage (Website-Formular, später E-Mail/Telegram)
- Sortiert: Neukunde-Anfrage / laufendes Projekt / Support / Spam
- Wertet aus, fasst zusammen, schlägt zuständigen Mitarbeiter vor
- Legt dem Chef alles auf den Tisch. Redet NIE mit dem Kunden.

### 🟦 VERA ("Vertrieb & Akquise")
- Sucht aktiv Betriebe ohne/mit schlechter Website oder mit KI-Automatisierungs-Potenzial
- Bewertet Leads, bereitet Ansprache-Entwürfe vor → legt sie dem Chef vor
- Arbeitet autonom im Hintergrund (täglich neue Leads)

### 🟩 SUSI ("Büro & Finanzen") — zusammengelegt
- Erstellt Angebots-Entwürfe aus vom Chef freigegebenen Eckdaten
- Erstellt Rechnungen aus freigegebenem Angebot, verfolgt Zahlungseingänge
- Verwaltet Dateien/Ordner auf Google Drive (Namensschema, Projektablage)

### 🟧 MAX ("Projektleiter") — nur noch Projekte
- Zerlegt freigegebene Aufträge in Aufgaben, verteilt an IT/QA, überwacht Fristen
- Meldet Projektstatus an den Chef

### 🟪 IT-KI ("Entwicklung")
- Baut Webseiten und Apps gemäß Aufgabe von Max
- Liefert immer INTERN an QA, nie direkt an den Kunden

### ✍️ CONNI ("Texter & Social Media")
- Schreibt Website-Texte, Blogartikel, Social-Media-Posts, Newsletter
- Plant Social-Media-Content, bereitet Posts als Entwurf vor (Versand nur per Freigabe)

### 🟨 QA ("Qualitätssicherung")
- Prüft IT-Ergebnisse + Texte auf Fehler/Vollständigkeit, BEVOR der Chef final freigibt
- Gibt an den Chef weiter mit Mängelliste oder "geprüft, bereit zur Freigabe"

### 🟥 SUPPORT ("Kundenbetreuung laufender Projekte")
- Bearbeitet Support- & Änderungswünsche bei LAUFENDEN Projekten
- Bereitet Antworten als Entwurf vor — Versand nur über Chef-Freigabe

### 🟫 MARKETING ("Bekanntheit & Ads")
- Macht das Unternehmen bekannt, plant Ads, behält Werbekosten im Blick
- Läuft im Hintergrund (nicht pro Projekt), veröffentlicht nichts ohne Freigabe

### 🔧 WALTER ("Wächter / System-Monitor")
- Überwacht das gesamte System: Fehler, Bugs, fehlgeschlagene Aufgaben, tote API-Keys
- Schlägt Alarm beim Chef, wenn etwas klemmt (z.B. eine KI-Aufgabe scheitert,
  ein Deploy fehlschlägt, eine Rechnung nicht gespeichert wird)
- Prüft regelmäßig: laufen alle Dienste? sind die Tische abgearbeitet? gibt es Hänger?

## ABLAUF (Projekt-Pipeline)
1. Anfrage rein        → DISPATCHER wertet aus → Chef
2. Eckdaten klären     → CHEF spricht mit Kunde → "Eckdaten geklärt"
3. Angebot             → SUSI (Entwurf) → Chef
4. Freigabe + Versand  → CHEF
5. Projekt planen      → MAX zerlegt & verteilt
6. Umsetzung           → IT-KI baut
7. Prüfung             → QA → Chef
8. Finale Freigabe     → CHEF gibt Lieferung an Kunde frei
9. Rechnung            → SUSI/FINANZ
10. Betreuung          → SUPPORT
Bei jedem "CHEF"-Schritt: STOPP, warten auf Freigabe.

## TECHNIK (geplant)
- Jeder Mitarbeiter = DB-Eintrag (name, rolle, avatar, status, system_prompt, tools[])
- Jeder hat einen "Tisch" = Aufgaben-Inbox (tasks-Tabelle, assignee = Mitarbeiter)
- Tisch-Item kommt rein → Mitarbeiter arbeitet autonom → Ergebnis als Entwurf → Chef
- Mitarbeiter-Gehirn: Anthropic-API mit rollenspezifischem System-Prompt + Werkzeugen
- Übergaben: Mitarbeiter A legt Task auf Tisch von Mitarbeiter B (mit Chef-Gate dazwischen)
- Chat pro Mitarbeiter im Dashboard + optional Telegram-Befehle

## STATUS
- Entwurfsphase. Rollen & Ablauf bestätigt. Offene Designfragen siehe Chat.
