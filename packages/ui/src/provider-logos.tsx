import { useId } from 'react'
import type { ReactNode } from 'react'
import type { AiProviderId } from '@genoffice/ai-provider/browser'

// ── AI provider brand logos (settings provider picker, composer model chip) ──
// Vector marks adapted from the MIT-licensed @lobehub/icons set, plus a
// hand-traced Genspark mark, OpenCode's pixel-block favicon glyph and a
// generic icon for the "custom" endpoint.
// Brand-colored logos keep their official colors in both themes (brand
// assets, not chrome — see CLAUDE.md theming rules); monochrome marks
// (OpenAI, Grok, OpenRouter, Atlas Cloud, OpenCode, Genspark, Custom) use
// currentColor so they stay legible in dark mode.
//
// Gradient-filled marks (Gemini) are components so useId can namespace their
// <linearGradient> ids per mount: the dropdown renders the selected option
// twice (trigger + open list), and duplicate SVG ids would make every
// url(#…) fill resolve to the first instance in the document.

function GeminiLogo() {
  const uid = useId()
  const d =
    'M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z'
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="#3186FF" />
      <path d={d} fill={`url(#${uid}g0)`} />
      <path d={d} fill={`url(#${uid}g1)`} />
      <path d={d} fill={`url(#${uid}g2)`} />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={`${uid}g0`}
          x1="7"
          x2="11"
          y1="15.5"
          y2="12"
        >
          <stop stopColor="#08B962" />
          <stop offset="1" stopColor="#08B962" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={`${uid}g1`}
          x1="8"
          x2="11.5"
          y1="5.5"
          y2="11"
        >
          <stop stopColor="#F94543" />
          <stop offset="1" stopColor="#F94543" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={`${uid}g2`}
          x1="3.5"
          x2="17.5"
          y1="13.5"
          y2="12"
        >
          <stop stopColor="#FABC12" />
          <stop offset=".46" stopColor="#FABC12" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// OpenCode's favicon at 24px: an outlined block with the lower half of the
// cut-out shaded; the Zen and Go tiers share the mark.
const opencodeLogo = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M6 4.5h12v15H6v-15zm3 3v9h6v-9H9z" />
    <path d="M9 10.5h6v6H9z" opacity=".45" />
  </svg>
)

// VEGA mark: 12-ray asterisk — shared by the `genspark` id too, which in this
// build is the signed-in VEGA account route (settings label "Account").
const vegaMark = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="1.3" x2="12" y2="22.7" />
    <line x1="12" y1="1.3" x2="12" y2="22.7" transform="rotate(30 12 12)" />
    <line x1="12" y1="1.3" x2="12" y2="22.7" transform="rotate(60 12 12)" />
    <line x1="12" y1="1.3" x2="12" y2="22.7" transform="rotate(90 12 12)" />
    <line x1="12" y1="1.3" x2="12" y2="22.7" transform="rotate(120 12 12)" />
    <line x1="12" y1="1.3" x2="12" y2="22.7" transform="rotate(150 12 12)" />
  </svg>
)

const LOGOS: Record<AiProviderId, ReactNode> = {
  genspark: vegaMark,
  vega: vegaMark,
  codex: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="m7 9 3 3-3 3M12.5 15H17" />
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
        fill="#D97757"
        fillRule="nonzero"
      />
    </svg>
  ),
  gemini: <GeminiLogo />,
  openai: (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
    </svg>
  ),
  xai: (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
    </svg>
  ),
  openrouter: (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d="M18.654 3.87a5.087 5.087 0 110 10.174L23.7 19.09c.64.641.187 1.737-.72 1.737H8.48a8.479 8.479 0 010-16.958h10.175zM8.479 7.26a5.087 5.087 0 100 10.176 5.087 5.087 0 000-10.175z" />
    </svg>
  ),
  // Atlas Cloud's mark (atlascloud.ai/logo.svg): an outlined "A" peak
  atlascloud: (
    <svg viewBox="0 0 27 26" fill="currentColor" aria-hidden="true">
      <path d="M13.4447 0L0 25.9887C6.22692 23.5227 11.249 23.1623 15.7643 23.3763L13.7037 18.8159C12.8029 18.7258 10.1905 18.7258 8.9519 19.0523L13.4447 9.06451C13.4447 9.06451 20.2009 23.7366 20.2121 23.7366C21.5183 23.9393 24.9977 25.1104 26.8895 25.9887L13.4447 0Z" />
    </svg>
  ),
  'opencode-zen': opencodeLogo,
  'opencode-go': opencodeLogo,
  // Sber's brand mark (SberBusiness icon set) in the official green
  sber: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.8405 10.209C21.9473 10.8 22.0007 11.3995 22 12.0002C21.9999 14.2682 21.2289 16.4688 19.8135 18.241C18.398 20.0131 16.4222 21.2514 14.2103 21.7527C11.9983 22.254 9.68169 21.9884 7.64054 20.9997C5.59938 20.011 3.95496 18.3577 2.97714 16.3113C1.99931 14.2649 1.74618 11.9469 2.25927 9.7377C2.77236 7.52848 4.0212 5.5593 5.80085 4.15332C7.58049 2.74734 9.78521 1.98808 12.0532 2.00014C14.3212 2.01221 16.5177 2.79488 18.2823 4.21972L16.3367 5.65374C14.9172 4.68365 13.2137 4.21688 11.4979 4.3279C9.78213 4.43892 8.15297 5.12133 6.87027 6.26627C5.58758 7.41121 4.72526 8.95273 4.42086 10.6449C4.11647 12.3371 4.38753 14.0825 5.19081 15.6027C5.99409 17.1229 7.28332 18.3302 8.85284 19.0322C10.4224 19.7342 12.1818 19.8904 13.8504 19.4758C15.519 19.0612 17.0007 18.0998 18.0592 16.7448C19.1177 15.3899 19.6919 13.7195 19.6903 12.0002V11.7956L21.8405 10.209Z"
        fill="#21A038"
      />
      <path
        d="M21.1123 7.87498C20.7918 7.1681 20.3897 6.50117 19.9141 5.88782L12.0018 11.7123L8.19568 9.33328V12.2031L12.0018 14.589L21.1123 7.87498Z"
        fill="#21A038"
      />
    </svg>
  ),
  // lobehub's Yandex mark (the "Я" glyph) in brand red
  yandex: (
    <svg viewBox="0 0 24 24" fillRule="evenodd" aria-hidden="true">
      <path
        d="M16.376 12.644L21 2h-3.842l-4.624 10.644h3.842zM13.915 24v-3.733c0-2.822-.352-3.64-1.407-5.988L6.933 2H3l7.124 15.709V24h3.79z"
        fill="#FC3F1D"
      />
    </svg>
  ),
  custom: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 6.5h8M15 6.5h6M3 12h3M10 12h11M3 17.5h11M18 17.5h3" />
      <circle cx="13" cy="6.5" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="17.5" r="2" />
    </svg>
  ),
}

/** Inline brand mark sized by the surrounding container (default `.gs-provider-logo`). */
export function ProviderLogo({
  id,
  className = 'gs-provider-logo',
}: {
  id: string
  className?: string
}) {
  return (
    <span className={className} aria-hidden="true">
      {LOGOS[id as AiProviderId] ?? LOGOS.custom}
    </span>
  )
}
