# AI models and settings

## Providers and models

Models and keys are configured in Settings (the account row at the bottom left of Home):

![The Settings window](img/settings-general.png)

- **VEGA on its servers**: sign in (device-code flow) and use it — zero configuration. Requests go to `https://api.vega.chat`, which is an OpenRouter-compatible endpoint, so any OpenRouter-style client can point at it.
- **Custom endpoints (BYOK)**: Settings ▸ AI takes a base URL and API key per protocol — OpenAI-compatible, Anthropic, Gemini, DeepSeek, DashScope (qwen) and more. Keys are stored in the app's settings file on this machine and sent only in request headers. Atlas Cloud is among the built-in protocols.
- A different model can be picked per capability: chat/generation, image generation, image analysis.
- **Connection test**: verify endpoint reachability and model visibility before saving.
- Base URLs may carry a path and query string (gateway-style); endpoint paths are appended correctly.

## Choosing a model

- The model picker sits at the top of the AI panel and in Settings ▸ AI Model — one choice for chat, plus separate choices for image generation and image analysis where the provider supports them.
- Start with the default VEGA model: it fits most office tasks (rewriting, tables, formulas, summaries). Switch to a larger model for hard reasoning or long documents, and to a smaller cheap one for quick drafts.
- An in-flight conversation keeps the old model until its next turn; new chats use the new choice right away.

## Prices and usage

- VEGA billing is pay-as-you-go per model. The full price list lives at [api.vega.chat/aimodels](https://api.vega.chat/aimodels) — check a model's input/output price before a big job.
- Current balance and spending are on the [VEGA dashboard](https://api.vega.chat/dashboard), also opened from the account menu's balance row.
- Without sign-in only the free built-in options work; sign in to unlock every model on the price list.

## CLI integration (Codex-class)

- Settings accept a local CLI program path (non-ASCII home directories and a ~ prefix work; ~ is expanded automatically); Detect models probes the CLI's available models.
- Validation checks existence only — no charset restrictions.

## When changes apply

- Model and endpoint changes apply immediately; an in-flight conversation keeps the old configuration until its next turn.
