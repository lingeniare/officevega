# Panel asystenta AI

Każdy edytor może wywołać panel AI: zaznacz coś, wydaj polecenie i obserwuj wynik pojawiający się na bieżąco.

## Otwieranie i korzystanie

![Panel AI w Docs](img/ai-panel.png)

- Sposoby otwarcia: **przycisk AI** na wstążce każdego edytora, **Ask AI** w menu kontekstowych lub Ask AI na pasku znaczników.
- Opisz zadanie zwykłymi słowami (przepisz to / zamień tę kolumnę na procenty / ułóż tę stronę od nowa...) i naciśnij Enter.
- Odpowiedzi pojawiają się **na bieżąco**. Gdy AI potrzebuje narzędzi (odczytać dokument, zmienić go), wykonuje je i kontynuuje, aż skończy.
- **Stop**: w każdej chwili możesz przerwać bieżącą turę.

## Co potrafi

- **Docs**: przepisywanie, rozwijanie, tłumaczenie i streszczanie; wstawianie tabel i obrazów; zmiana formatowania. Każda tura najpierw zapisuje migawkę.
- **Sheets**: formuły, wypełnianie danych, zbiorcze przekształcenia i formatowanie.
- **Slides**: generowanie całej prezentacji, korekta układu, przepisywanie treści.
- **PDF**: pytania i streszczenia dotyczące zaznaczonego tekstu lub stron.
- **Markdown / HTML**: przepisywanie, rozwijanie i tłumaczenie.

## Historia czatów

- Każda rozmowa zapisuje się automatycznie i pozostaje na tym komputerze — otwórz panel jutro i kontynuuj tam, gdzie skończyłeś.
- Zacznij nowy czat przyciskiem **New chat**, a przełączaj się między dawnymi czatami na liście historii u góry panelu.
- Zmień nazwę czatu, by szybciej go znaleźć; usunięcie czatu kasuje go na zawsze. Usunięcie czatu nigdy nie dotyka Twoich dokumentów.

## Cofanie i bezpieczeństwo

- Panel w Docs prowadzi **listę wersji**: jedna migawka na turę. Możesz wrócić do dowolnej z nich, a samo cofnięcie da się cofnąć klawiszami Ctrl+Z. Migawki przetrwają ponowne otwarcie dokumentu.
- Zmiany AI przechodzą tą samą ścieżką edycji co zmiany ręczne (można je cofnąć i wymagają zapisu) — nic nie omija Twojego potwierdzenia zapisu.

## Prywatność i anonimizacja

- Polecenia i odpowiednia treść dokumentu trafiają do **usługi modelu, którą skonfigurowałeś** (hostowanego VEGA lub własnego punktu końcowego, w następnym rozdziale). Bez konfiguracji nic nie jest wysyłane.
- **Anonimizacja (152-FZ)**: przed wysłaniem aplikacja może zamaskować dane osobowe — imiona, numery telefonów, adresy e-mail, dane paszportowe — tak aby model ich nigdy nie zobaczył. Włącz to w Settings ▸ AI; zamaskowane fragmenty wracają automatycznie do dokumentu po odpowiedzi.
- **Brak analityki śledzącej**: OfficeVega jest dostarczany bez Google Analytics i bez żadnych narzędzi śledzących firm trzecich. Nie ma przełącznika statystyk użycia, bo nie ma czego wyłączać — treść dokumentów i czatów nigdy nie opuszcza wybranej przez Ciebie trasy.
- Pliki lokalne nie są przesyłane nigdzie indziej; klucze BYOK są przechowywane w pliku ustawień aplikacji na tym komputerze i wysyłane wyłącznie w nagłówkach żądań.
