# Shared bundled fonts

Font files that more than one app ships. Each app used to carry its own copy;
keeping a single set here means one download per package, one licence record,
and one place for the build-time patch to write to.

| Font             | Files                   | License | Used by              |
| ---------------- | ----------------------- | ------- | -------------------- |
| Carlito GO       | `Carlito-*.ttf`         | OFL 1.1 | docs, sheets, slides |
| Google Sans      | `GoogleSans*.woff2`     | OFL 1.1 | all apps (AI panel)  |
| Google Sans Code | `GoogleSansCode*.woff2` | OFL 1.1 | all apps (AI panel)  |
| Google Sans Flex | `GoogleSansFlex.woff2`  | OFL 1.1 | all apps (AI panel)  |

"Carlito GO" is Carlito 1.103 (LibreOffice's metric-compatible Calibri
substitute) with Vietnamese stacked diacritics rebuilt by
`tools/patch-carlito-vi.py`, renamed per OFL 1.1 §2 ("Carlito" is a Reserved
Font Name). The full OFL text lives in `apps/docs/src/renderer/fonts/LICENSE-OFL.txt`
and the per-font notes in `apps/docs/src/renderer/fonts/README.md`.

The Google Sans set (variable fonts from github.com/google/fonts, OFL 1.1)
backs the `--gs-font-*` stacks declared in `src/tokens.css`. `GoogleSans*` is
subsetted to Latin/Cyrillic/Greek/Hebrew/Devanagari/Thai/Vietnamese plus chat
punctuation; `GoogleSansFlex` is instanced down to its `opsz`+`wght` axes.
Code and Flex have no Cyrillic — those scripts resolve through the fallback
tails of the stacks.

Reference the files through the package export, from CSS or from a main-process
asset import:

```css
src: url('@genoffice/ui/fonts/Carlito-Regular.ttf');
```

```ts
import carlitoRegular from '@genoffice/ui/fonts/Carlito-Regular.ttf?asset'
```
