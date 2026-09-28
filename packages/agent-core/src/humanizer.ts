/**
 * Humanizer rules for generated document prose, distilled from
 * https://github.com/blader/humanizer (based on Wikipedia's "Signs of AI
 * writing"). Two versions:
 * - HUMANIZER_RULES: full block for the tool-less long-form writers
 *   (write_document), where the reply body IS the document text.
 * - HUMANIZER_RULES_BRIEF: compact block for agent prompts whose tools let
 *   the model write document text inline (insert_content, replace_blocks,
 *   insertContent, …).
 * Kept language-agnostic where possible: the stock-word list is English,
 * so it asks for equivalents in the output language, and the dash rule is a
 * soft preference (a hard ban breaks punctuation in languages where the
 * dash is normative, e.g. Russian).
 */
export const HUMANIZER_RULES = [
  '## Voice — write like a person, not a chatbot',
  '- Every sentence adds something the reader did not already have; cut anything that only signals importance.',
  '- Vary sentence length — real writing alternates short and long; never force ideas into groups of three.',
  '- No staged contrasts ("not X but Y", "it\'s not just X — it\'s Y"): state the point directly.',
  '- No one-line closers or dramatic fragments that restate the previous paragraph; end a section on its last concrete fact.',
  '- No pseudo-profound framing ("the real question is", "at its core", "X is the Y of Z") and no answering objections nobody raised.',
  '- No inflated significance: nothing is "a pivotal moment", "a testament to", or "plays a key role"; no "despite these challenges…" wrap-ups, no bright-future send-offs.',
  '- Plain verbs: is/are/has beat "serves as", "boasts", "features"; name the actual relationship instead of "associated/linked to".',
  '- No sales language ("renowned", "vibrant", "cutting-edge") and no stock AI words ("delve", "crucial", "pivotal", "landscape" as an abstraction, "underscore", "showcase", "foster", "meticulous") or their equivalents in the output language.',
  '- Hedge only where the source is genuinely uncertain — never stack qualifiers ("could potentially").',
  '- Dashes are not the universal connector: prefer a period, comma, colon, or parentheses, keeping a dash only where the language\'s punctuation calls for one.',
  '- No chatbot residue inside the document ("I hope this helps", "let me know") and no knowledge-cutoff disclaimers ("as of my last update", "not publicly documented") — state what the sources show or omit the point.',
  '- No decorative bold or bold-label list items whose label adds nothing; headings in sentence case; no emoji.',
].join('\n')

export const HUMANIZER_RULES_BRIEF = [
  '- Text you write into the document reads like a person wrote it: every sentence adds a fact, sentence length varies, points are stated directly.',
  '- No AI tells: "not X but Y" contrasts, one-line restatement closers, "the real question is" framing, objections nobody raised, inflated significance ("pivotal", "testament", "key role"), sales words ("renowned", "vibrant"), stock words ("delve", "underscore", "showcase") or their equivalents in the output language.',
  '- Prefer is/has over "serves as / boasts / features"; name actual relationships instead of "associated with"; hedge only on real uncertainty.',
  '- Dashes are a last resort, not a connector; no decorative bold or bold-label lists; sentence-case headings; no chatbot residue or knowledge-cutoff disclaimers in document text.',
].join('\n')
