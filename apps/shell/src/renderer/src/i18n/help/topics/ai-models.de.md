# KI-Modelle und Einstellungen

## Anbieter und Modelle

Modelle und Schlüssel werden in den Einstellungen konfiguriert (die Kontenzeile unten links auf der Startseite):

![Das Einstellungsfenster](img/settings-general.png)

- **VEGA auf VEGA-Servern**: anmelden (Gerätecode-Verfahren) und sofort loslegen — keine Konfiguration nötig. Anfragen gehen an `https://api.vega.chat`, einen OpenRouter-kompatiblen Endpunkt, sodass jeder OpenRouter-ähnliche Client darauf zeigen kann.
- **Eigene Endpunkte (BYOK)**: Einstellungen ▸ KI nimmt pro Protokoll eine Basis-URL und einen API-Schlüssel entgegen — OpenAI-kompatibel, Anthropic, Gemini, DeepSeek, DashScope (qwen) und weitere. Schlüssel werden in der Einstellungsdatei der App auf diesem Rechner gespeichert und nur in Anfrage-Headern gesendet.
- Pro Fähigkeit lässt sich ein eigenes Modell wählen: Chat/Erzeugung, Bilderzeugung, Bildanalyse.
- **Verbindungstest**: prüft vor dem Speichern, ob der Endpunkt erreichbar ist und das Modell sichtbar ist.
- Basis-URLs dürfen einen Pfad und eine Abfragezeichenfolge enthalten (Gateway-Stil); Endpunktpfade werden korrekt angehängt.

## Modell wählen

- Die Modellauswahl befindet sich oben im KI-Panel und unter Einstellungen ▸ KI-Modell — eine Wahl für den Chat, dazu getrennte Wahlen für Bilderzeugung und Bildanalyse, sofern der Anbieter sie unterstützt.
- Beginnen Sie mit dem VEGA-Standardmodell: Es passt zu den meisten Büroaufgaben (Umschreiben, Tabellen, Formeln, Zusammenfassungen). Wechseln Sie für schwierige Überlegungen oder lange Dokumente zu einem größeren Modell und für schnelle Entwürfe zu einem kleineren, günstigen Modell.
- Eine laufende Unterhaltung behält das alte Modell bis zu ihrem nächsten Durchgang; neue Chats verwenden die neue Wahl sofort.

## Preise und Nutzung

- Die Abrechnung bei VEGA erfolgt nutzungsabhängig je Modell. Die vollständige Preisliste finden Sie unter [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — prüfen Sie Eingabe- und Ausgabepreis eines Modells vor einem größeren Auftrag.
- Aktuelles Guthaben und Ausgaben stehen im [VEGA-Dashboard](https://api.vega.chat/dashboard), das Sie auch über die Guthabenzeile im Kontomenü öffnen.
- Basis-URLs dürfen Pfad und Abfragezeichenfolge enthalten (Gateway-Stil); Endpunktpfade werden korrekt angehängt.

## CLI-Integration (Codex-Klasse)

- Die Einstellungen akzeptieren einen Pfad zu einem lokalen CLI-Programm (Benutzerordner mit Nicht-ASCII-Zeichen und ein ~-Präfix funktionieren; ~ wird automatisch erweitert). Modelle erkennen fragt die verfügbaren Modelle der CLI ab.
- Die Prüfung kontrolliert nur das Vorhandensein — es gibt keine Einschränkungen beim Zeichensatz.

## Wann Änderungen gelten

- Modell- und Endpunktänderungen gelten sofort; eine laufende Unterhaltung behält die alte Konfiguration bis zu ihrem nächsten Durchgang.
