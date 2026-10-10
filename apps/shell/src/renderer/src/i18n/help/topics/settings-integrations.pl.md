# Ustawienia, język, motyw i integracje MCP

## Otwieranie ustawień

Wiersz konta w lewym dolnym rogu strony Home otwiera panel ustawień (gdy nie jesteś zalogowany, pokazuje Sign in). Ma sześć sekcji: Account, AI Model, AI Media & Search, General, Integrations i About.

![Settings ▸ General, gdzie znajdują się język, motyw, AutoSave i przełącznik statystyk użycia](img/settings-general.png)

Konfiguracja modeli ma własny artykuł. W sekcji **AI Media & Search** włączasz dla każdego dostawcy generowanie obrazów, analizę obrazów, analizę wideo, wyszukiwanie w sieci i wyszukiwanie plików lokalnych.

## Język

- Ustawienia oferują **21 języków interfejsu**: angielski, chiński uproszczony, japoński, koreański, francuski, niemiecki, hiszpański, tajski, indonezyjski, rosyjski, arabski, portugalski, włoski, polski, czeski, niderlandzki, malajski, hebrajski, hindi, chiński tradycyjny i wietnamski.
- Zmiana działa natychmiast i zostaje zapamiętana; natywny pasek menu jest odbudowywany w nowym języku.

## Motyw

Light / Dark / System. Opcja System podąża za wyglądem systemu, a edytory zmieniają się synchronicznie, bez migotania. Ten sam przełącznik koloruje też panel AI i stronę Home, więc cała aplikacja trzyma jeden wygląd: wybierz Light do jasnych pomieszczeń, Dark do pracy nocą, a System, by iść za Windows.

## Ogólne

- **Brak analityki śledzącej**: OfficeVega jest dostarczany bez Google Analytics i bez żadnych narzędzi śledzących firm trzecich — treść dokumentów, nazwy plików i zdarzenia użycia nigdy nie są zbierane ani wysyłane.
- **Położenie panelu bocznego AI** (po lewej lub po prawej), **rozmiar tekstu w panelu AI** oraz **sprawdzanie pisowni w czacie AI**.
- **Otwieraj panel AI w nowych dokumentach** — wyłączone: nowy dokument zaczyna się ze zwiniętym panelem, który jest o jedno kliknięcie dalej.
- **Automatycznie zapisuj wszystkie dokumenty** włącza AutoSave domyślnie we wszystkich edytorach; można je nadal wyłączyć dla jednego okna.
- **Lokalizacja zapisu** z przyciskiem **Change** oraz **Default app for Office documents**, aby OfficeVega obsługiwał pliki .docx / .xlsx / .pptx.

## AI Media & Search

To nie są przełączniki. Każda funkcja wybiera dostawcę, który ją obsługuje, a klucz dostawcy i bazowy adres URL wpisuje się raz i są one wspólne:

- **Web search**, **Image generation**, **Image analysis** i **Video analysis**, każda z dostawcą, modelem, kluczem i bazowym adresem URL. Wybierz **VEGA** jako dostawcę, aby kierować je przez `api.vega.chat` z użyciem klucza logowania.
- **Local file search** działa na tym komputerze. Pod nim znajduje się **Jev search reranking**, domyślnie **wyłączone**. Po włączeniu fragmenty 20 najlepszych lokalnych wyników — do 1200 znaków z każdego dokumentu oraz nazwy plików i folderów — trafiają do modelu Jev firmy TypeSafe i zostają ponownie uszeregowane według trafności. Gdy jest wyłączone, nic nie opuszcza urządzenia.

## O aplikacji

- **Version**, strona projektu [officevega.com](https://officevega.com) oraz strona wydań [officevega.com/releases](https://officevega.com/releases).
- **Update Channel**: Stable lub Beta. Zmiana działa od razu i sprawdza dostępność aktualizacji; nie cofnie instalacji Beta do kanału Stable.

## Powiązanie aplikacji domyślnej

Ustawienia mogą zarejestrować OfficeVega jako obsługę plików .docx / .xlsx / .pptx / .pdf i podobnych (rejestracja aplikacji domyślnej na poziomie systemu; potwierdź, gdy system o to poprosi).

## Informacje o komponentach zewnętrznych i aktualizacje

- Help ▸ Third-party notices: pełny wykaz licencji open source dołączonych do aplikacji.
- Help ▸ Check for updates: uruchamia ręczne sprawdzenie; jeśli dostępna jest nowsza wersja, pojawi się propozycja instalacji.

## Logowanie do VEGA

- Logowanie (w ustawieniach lub na liście projektów w chmurze) korzysta z przepływu **kodu urządzenia**: OfficeVega pokazuje kod i otwiera stronę logowania w przeglądarce; po zakończeniu proces przebiega dalej automatycznie.
- Logowanie służy tylko do dwóch rzeczy: listy projektów w chmurze i hostowanych modeli VEGA pod adresem `api.vega.chat`. Bez niego wszystkie funkcje lokalne i własne modele nadal działają.
- Wylogowanie to jedno kliknięcie w ustawieniach.

## Pomoc

Pytania, pomysły i zgłoszenia błędów: [officevega.com/feedback](https://officevega.com/feedback), kanał na Telegramie [t.me/getmyai](https://t.me/getmyai), e-mail [mail@vega.chat](mailto:mail@vega.chat). Twórca: [getmyai.io](https://getmyai.io) (Dmitrij Filippow).

## Integracja MCP (dla zaawansowanych użytkowników i klientów AI)

**Integrations** to panel, który łączy OfficeVega z agentem programistycznym, i ma własny artykuł: Podłączanie agenta programistycznego. W skrócie: wybierz drogę (wiersz poleceń albo MCP), przejdź przez tę sekcję, a potem rozpocznij nowy czat i zadaj pytanie.

![Settings ▸ Integrations: trzy kroki, potem wiersze umiejętności i opcje MCP](img/settings-integrations.png)

W sekcji **Local HTTP server** aplikacja może sama uruchomić serwer — przełącznik włączenia i port. **Advanced** dodaje adres kontroli stanu i plik dziennika. Serwer nasłuchuje wyłącznie na localhost.

## Ściągawka poleceń

| Polecenie           | Co robi                      |
| ------------------- | ---------------------------- |
| `officevega <file>` | otwiera plik                 |
| `officevega mcp`    | uruchamia lokalny serwer MCP |
| `officevega --help` | wszystkie polecenia i opcje  |
