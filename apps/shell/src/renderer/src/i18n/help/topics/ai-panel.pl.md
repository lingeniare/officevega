# Panel asystenta AI

Każdy edytor może wywołać panel AI: zaznacz coś, wydaj polecenie i obserwuj wynik pojawiający się na bieżąco.

## Otwieranie i korzystanie

![Panel AI w Docs](img/ai-panel.png)

- Sposoby otwarcia: **przycisk AI** na wstążce każdego edytora, **Ask AI** w menu kontekstowych lub Ask AI na pasku znaczników.
- Opisz zadanie zwykłymi słowami (przepisz to / zamień tę kolumnę na procenty / ułóż tę stronę od nowa...) i naciśnij Enter.
- Odpowiedzi są renderowane **strumieniowo**; gdy AI potrzebuje narzędzi (odczytać dokument, go zmienić), wykonuje je i kontynuuje aż do końca.
- **Zatrzymaj**: w każdej chwili przerywa bieżącą turę.
- **Kolejka**: gdy odpowiedź się generuje, Enter odkłada wiadomość do kolejki zamiast ją porzucać — pasek nad polem ввода je liczy; rozwiń, aby edytować, usuwać, zmieniać kolejność, wstrzymać lub wyczyścić. Następna wiadomość wyśle się sama po zakończeniu tury; Esc nadal przerywa turę.

## Co potrafi

- **Docs**: przepisywanie/rozbudowa/tłumaczenie/streszczanie, wstawianie tabel i obrazów, zmiana formatowania; każda tura zaczyna się od migawki.
- **Sheets**: formuły, wypełnianie danych, przekształcenia wsadowe, formatowanie.
- **Slides**: generowanie całej prezentacji, korekta układu, przepisywanie tekstów.
- **PDF**: pytania i odpowiedzi oraz streszczenia na podstawie zaznaczonego tekstu lub stron.
- **Markdown / HTML**: przepisywanie, rozbudowa, tłumaczenie.
- **Strona główna ▸ Ask AI** odpowiada z plików oznaczonych gwiazdką i je cytuje — panel bazy wiedzy ma własną sekcję w rozdziale o stronie głównej, a panel AI w Docs ma tę samą umiejętność.

## Cofanie i bezpieczeństwo

- Panel w Docs prowadzi **listę wersji**: jedna migawka na turę. Możesz wrócić do dowolnej z nich, a samo cofnięcie da się cofnąć klawiszami Ctrl+Z. Migawki przetrwają ponowne otwarcie dokumentu.
- Zmiany AI przechodzą tą samą ścieżką edycji co zmiany ręczne (można je cofnąć i wymagają zapisu) — nic nie omija Twojego potwierdzenia zapisu.

## Ukrycie zaznaczenia przed AI

- W Slides, HTML i Markdown zaznaczenie można schować przed oczami modelu: prawy przycisk ▸ **Ukryj zaznaczenie przed AI**, nadaj nazwę zastępczą, a model czyta `{{nazwa}}` w jego miejsce. (Markdown uzbraja tę pozycję przełącznikiem przekreślonego oka na wstążce; w HTML mieszka w panelu źródła.)
- Plik zachowuje prawdziwy tekst — zapis, eksport i druk są nietknięte, a oznaczenie przeżywa ponowne otwarcie. Ta sama pozycja zdejmuje ukrycie (Markdown ma osobne **Pokaż zaznaczenie AI ponownie**).
- HTML ukrywa treści elementów, wartości atrybutów i literały tekstowe w skryptach; wyrenderowana strona nigdy się nie zmienia.
- Slides ukrywa też całe obrazy, wideo i audio, a slajd z ukrytą treścią nigdy nie jest wysyłany jako zrzut: automatyczne sprawdzanie układu pomija stronę i o tym informuje.
- To działa tylko na AI w aplikacji — CLI, narzędzia MCP i eksport headless czytają plik wprost i wciąż widzą tekst.

## Prywatność i anonimizacja

- Polecenia i odpowiednia treść dokumentu trafiają do **usługi modelu, którą skonfigurowałeś** (hostowanego VEGA lub własnego punktu końcowego, w następnym rozdziale). Bez konfiguracji nic nie jest wysyłane.
- **Anonimizacja (152-FZ)**: przed wysłaniem aplikacja może zamaskować dane osobowe — imiona, numery telefonów, adresy e-mail, dane paszportowe — tak aby model ich nigdy nie zobaczył. Włącz to w Settings ▸ AI; zamaskowane fragmenty wracają automatycznie do dokumentu po odpowiedzi.
- **Brak analityki śledzącej**: OfficeVega jest dostarczany bez Google Analytics i bez żadnych narzędzi śledzących firm trzecich. Nie ma przełącznika statystyk użycia, bo nie ma czego wyłączać — treść dokumentów i czatów nigdy nie opuszcza wybranej przez Ciebie trasy.
- Pliki lokalne nie są przesyłane nigdzie indziej; klucze BYOK są przechowywane w pliku ustawień aplikacji na tym komputerze i wysyłane wyłącznie w nagłówkach żądań.
