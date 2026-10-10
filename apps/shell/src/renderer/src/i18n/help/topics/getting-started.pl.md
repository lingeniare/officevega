# Szybki start: interfejs i podstawy

OfficeVega to pakiet biurowy działający w całości na Twoim komputerze: jedno okno, jeden rząd kart, a w nim sześć edytorów — Docs (edytor tekstu), Sheets (arkusze), Slides (prezentacje), PDF, Markdown i HTML. Pliki to prawdziwe pliki .docx / .xlsx / .pptx / .pdf, w pełni wymienne z Wordem, Excelem i PowerPointem. Nie jest potrzebne połączenie z internetem.

## Przegląd interfejsu

![Ekran strony głównej](img/home-screen.png)

Okno składa się z trzech części:

- **Pasek kart (u góry)**: każdy otwarty plik to karta. Karta Home po lewej stronie jest zawsze obecna i nie można jej zamknąć; pozostałe karty to Twoje dokumenty. Kliknij kartę dwukrotnie, aby zmienić nazwę pliku w miejscu.
- **Obszar zawartości**: edytor (lub Home) należący do aktywnej karty.
- **Pasek menu**: u góry okna w systemie Windows. Menu File / Edit / View zmieniają się zależnie od aktywnego edytora.

## Tworzenie dokumentu

Wybierz jedną z tych metod:

- Kliknij kartę szybkiego tworzenia w sekcji [Quick start](help://getting-started) na **Home** (AI Docs, AI Sheets, AI Slides, ...).
- Menu **File ▸ New**: Docs (ctrl+N), Sheets, Slides, Markdown, HTML lub PDF.
- Przeciągnij plik na okno albo kliknij go dwukrotnie w menedżerze plików (jeśli OfficeVega jest aplikacją domyślną).

Nowy dokument otwiera się bez nazwy; plik na dysku powstaje dopiero przy pierwszym zapisie.

## Otwieranie plików

- Menu **File ▸ Open** (ctrl+O) otwiera systemowy wybór plików: .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Kliknij dowolną pozycję na liście **Recent** na Home.
- Polecenie `officevega <file>` w terminalu także otwiera pliki.

## Model zapisu

- **Zapis ręczny**: ctrl+S albo File ▸ Save / Save As. Przy pierwszym zapisie aplikacja poprosi o lokalizację i nazwę.
- **Autozapis** włącza się dopiero po tym, jak ręcznie zapiszesz plik co najmniej raz — plik PDF, który tylko czytasz, nigdy nie zostanie nadpisany po cichu. Autozapis działa krótko po zmianie treści.
- Zamknięcie karty z niezapisanymi zmianami najpierw pyta: Save / Discard / Cancel.
- Każdy zapis odbywa się atomowo (plik tymczasowy + zmiana nazwy), więc nagła utrata zasilania nie zostawi połowy pliku.

## Popularne skróty

| Czynność                | Windows |
| ----------------------- | ------- |
| Nowy dokument           | ctrl+N  |
| Otwórz                  | ctrl+O  |
| Zapisz                  | ctrl+S  |
| Zamknij kartę           | ctrl+W  |
| Otwórz ten podręcznik   | F1      |
| Zwiń wstążkę            | Ctrl+F1 |

**Zwijanie wstążki** działa w każdym edytorze. Wiersz kart pozostaje na miejscu, a pasek poleceń pod nim znika. Wybrana karta jest jednocześnie przyciskiem zwijania, więc dopóki wstążka jest zwinięta, żadna karta nie jest wybrana, a kliknięcie dowolnej karty przywraca pasek. Podwójne kliknięcie karty robi to samo. Stan, w jakim ją zostawiono, jest zapamiętywany osobno dla każdego edytora.

Skróty używane w każdym edytorze (malarz formatów, znajdź i zamień, operacje na tabelach, ...) opisano w odpowiednich rozdziałach. Docs ma dodatkowo okno skrótów klawiaturowych z wyszukiwaniem (**ctrl+/**), które obejmuje wszystkie jego skróty.

<!--
## Skróty Option+Command

Option+Command to warstwa, którą Word rezerwuje na skoki strukturalne, a OfficeVega wypełnia ją w ten sam sposób. Docs zajmuje z niej większość, Sheets dwa własne, aby zgadzać się z Excelem, a jeden skrót działa wszędzie.

**Docs**

| Skrót (macOS)   | Co robi                | Windows / Linux    |
| --------------- | ---------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3 | Nagłówek 1 / 2 / 3     | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0             | Normalny (tekst główny) | Ctrl+Alt+0         |
| ⌥⌘M             | Okno akapitu           | Ctrl+Alt+M         |
| ⌥⌘A             | Nowy komentarz         | Ctrl+Alt+A         |
| ⌥⌘F             | Wstaw przypis dolny    | Ctrl+Alt+F         |
| ⌥⌘E             | Wstaw przypis końcowy  | Ctrl+Alt+D         |
| ⌥⌘G             | Przejdź do             | Ctrl+G             |

Dwa z tych skrótów zmieniają się w Windows, z tego samego powodu, dla którego Word je rozdziela. **macOS zarezerwowało ⌥⌘D** — pokazuje i ukrywa Dock — więc przypis końcowy to ⌥⌘E na Macu, a wszędzie indziej Ctrl+Alt+D. A **Przejdź do** rezygnuje z Alt: Ctrl+G, podczas gdy skrót na Macu zawiera go.

**Sheets**, gdy siatka ma fokus

| Skrót (macOS) | Co robi              | Windows / Linux |
| ------------- | -------------------- | --------------- |
| ⌥⌘0           | Krawędzie zewnętrzne | Ctrl+Shift+7    |
| ⌥⌘−           | Brak krawędzi        | Ctrl+Shift+−    |

Wersja dla Windows nie jest przepisaniem pary z Maca. Excel for Mac daje Sheets **oba** — ⌘⇧7 i ⌥⌘0 to dwa klawisze tych samych krawędzi zewnętrznych — więc w Windows polecenie zachowuje dotychczasowy skrót Ctrl+Shift, a warstwy Option po prostu nie ma.

Zwróć uwagę, że **⌥⌘0 oznacza Normalny w Docs, a Krawędzie zewnętrzne w Sheets**. Te dwa nigdy nie pojawiają się w tym samym edytorze, więc w praktyce nie kolidują, ale ⌥⌘0 jest już zajęte i nie może być skrótem globalnym.

**Każdy edytor**: **⌥⌘R / Ctrl+F1** zwija wstążkę, jak opisano wyżej.

To pozostawia ⌥⌘D wolne dla OfficeVega na macOS, gdyby jakieś przyszłe polecenie go potrzebowało.
-->

## Co dalej

- Gdzie znajdują się pliki: [Home screen](help://home-screen).
- Zarządzanie wieloma otwartymi plikami: [Tabs and window management](help://tabs-and-windows).
- Zlecanie pracy AI: [AI assistant panel](help://ai-panel).
- Język, motyw, aplikacje domyślne: [Settings, language, theme and MCP integrations](help://settings-integrations).

Potrzebujesz pomocy? Zapytaj na [officevega.com/feedback](https://officevega.com/feedback), śledź nowości na kanale Telegram [t.me/getmyai](https://t.me/getmyai) lub napisz na [mail@vega.chat](mailto:mail@vega.chat).
