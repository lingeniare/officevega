# Modele AI i ustawienia

## Dostawcy i modele

Modele i klucze konfiguruje się w ustawieniach (wiersz konta w lewym dolnym rogu strony Home):

![Okno ustawień](img/settings-general.png)

- **VEGA na jego serwerach**: zaloguj się (przepływ z kodem urządzenia) i korzystaj bez żadnej konfiguracji. Żądania trafiają na `https://api.vega.chat`, który jest punktem końcowym kompatybilnym z OpenRouter, więc każdy klient w stylu OpenRouter może się do niego podłączyć.
- **Własne punkty końcowe (BYOK)**: Settings ▸ AI przyjmuje bazowy adres URL i klucz API dla każdego protokołu — zgodnego z OpenAI, Anthropic, Gemini, DeepSeek, DashScope (qwen) i innych. Klucze są przechowywane w pliku ustawień aplikacji na tym komputerze i wysyłane wyłącznie w nagłówkach żądań.
- Dla każdej funkcji można wybrać inny model: czat i generowanie tekstu, generowanie obrazów, analiza obrazów.
- **Test połączenia**: sprawdza dostępność punktu końcowego i widoczność modelu przed zapisaniem.
- Adresy bazowe mogą zawierać ścieżkę i ciąg zapytania (w stylu bramy); ścieżki punktów końcowych są dokładnie doklejane.

## Wybór modelu

- Selektor modelu znajduje się u góry panelu AI oraz w Settings ▸ AI Model — jeden wybór dla czatu oraz osobne wybory dla generowania obrazów i analizy obrazów, tam gdzie dostawca to obsługuje.
- Zacznij od domyślnego modelu VEGA: sprawdza się w większości zadań biurowych (przepisywanie, tabele, formuły, streszczenia). Przejdź na większy model do trudnego rozumowania lub długich dokumentów, a na mniejszy i tańszy do szybkich szkiców.
- Trwająca rozmowa zachowuje dotychczasowy model do swojej następnej tury; nowe czaty od razu używają nowego wyboru.

## Ceny i zużycie

- Rozliczenie VEGA jest pay-as-you-go, osobno dla każdego modelu. Pełny cennik znajduje się na [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — sprawdź cenę wejścia i wyjścia modelu przed dużym zadaniem.
- Aktualne saldo i wydatki są na [panelu VEGA](https://api.vega.chat/dashboard), który otworzysz także z wiersza salda w menu konta.
- Bez logowania działają tylko bezpłatne wbudowane opcje; zaloguj się, aby odblokować wszystkie modele z cennika.

## Integracja CLI (klasy Codex)

- Ustawienia przyjmują ścieżkę do lokalnego programu CLI (katalogi domowe z niełacińskimi znakami i prefiks ~ działają; ~ jest rozwijany automatycznie). Przycisk **Wykryj modele** sprawdza, jakie modele udostępnia CLI.
- Walidacja sprawdza jedynie istnienie pliku — bez ograniczeń co do zestawu znaków.

## Kiedy zmiany zaczynają działać

- Zmiany modelu i punktu końcowego działają natychmiast; trwająca rozmowa zachowuje poprzednią konfigurację aż do swojej następnej tury.
