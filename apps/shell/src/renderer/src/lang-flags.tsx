/**
 * Flag chips for the language picker: 18×12 inline SVGs, rounded through a
 * per-instance clipPath (useId — the same flag can mount twice: trigger + open
 * option). Flag colors are document-like fixed content, not chrome — the theme
 * never remaps them; the hairline edge uses a token so pale flags stay legible.
 */
import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Lang } from '@genoffice/i18n'

function FlagSvg({ children }: { children: ReactNode }) {
  const clipId = useId()
  return (
    <svg className="set-lang-flag" viewBox="0 0 18 12" aria-hidden="true" focusable="false">
      <clipPath id={clipId}>
        <rect width="18" height="12" rx="2.5" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <rect
        className="set-lang-flag-edge"
        x="0.5"
        y="0.5"
        width="17"
        height="11"
        rx="2"
        fill="none"
      />
    </svg>
  )
}

const FLAGS: Record<Lang, ReactNode> = {
  az: (
    <>
      <rect width="18" height="4" fill="#00b9e4" />
      <rect y="4" width="18" height="4" fill="#ef3340" />
      <rect y="8" width="18" height="4" fill="#509e2f" />
      <circle cx="8.6" cy="6" r="1.7" fill="#fff" />
      <circle cx="9.1" cy="6" r="1.35" fill="#ef3340" />
      <rect
        x="10.35"
        y="5.45"
        width="1.1"
        height="1.1"
        fill="#fff"
        transform="rotate(45 10.9 6)"
      />
    </>
  ),
  en: (
    <>
      <rect width="18" height="12" fill="#fff" />
      {[0, 2, 4, 6, 8, 10].map((y) => (
        <rect key={y} y={y} width="18" height="1" fill="#b22234" />
      ))}
      <rect width="7.4" height="6.5" fill="#3c3b6e" />
      {[1.5, 3.25, 5].map((y) =>
        [1.7, 3.7, 5.7].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.4" fill="#fff" />),
      )}
    </>
  ),
  ka: (
    <>
      <rect width="18" height="12" fill="#fff" />
      <rect x="7.5" width="3" height="12" fill="#f00" />
      <rect y="4.5" width="18" height="3" fill="#f00" />
      {[
        [3.75, 2.25],
        [14.25, 2.25],
        [3.75, 9.75],
        [14.25, 9.75],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`} fill="#f00">
          <rect x={cx! - 0.65} y={cy! - 0.225} width="1.3" height="0.45" />
          <rect x={cx! - 0.225} y={cy! - 0.65} width="0.45" height="1.3" />
        </g>
      ))}
    </>
  ),
  kk: (
    <>
      <rect width="18" height="12" fill="#00afca" />
      <rect x="0.9" width="1.8" height="12" fill="#fec50c" />
      {[2.5, 6, 9.5].map((y) => (
        <rect
          key={y}
          x="1.35"
          y={y - 0.45}
          width="0.9"
          height="0.9"
          fill="#00afca"
          transform={`rotate(45 1.8 ${y})`}
        />
      ))}
      <circle cx="10.4" cy="6" r="2.3" fill="#fec50c" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const [c, s] = [Math.cos(rad), Math.sin(rad)]
        return (
          <line
            key={deg}
            x1={10.4 + 2.8 * c}
            y1={6 + 2.8 * s}
            x2={10.4 + 3.5 * c}
            y2={6 + 3.5 * s}
            stroke="#fec50c"
            strokeWidth="0.5"
          />
        )
      })}
      <path d="M8.2 10.3c1.5-1.3 2.9-1.3 4.4 0" stroke="#fec50c" strokeWidth="0.55" fill="none" />
    </>
  ),
  ky: (
    <>
      <rect width="18" height="12" fill="#e8112d" />
      <circle cx="9" cy="6" r="2.7" fill="#ffed00" />
      <circle cx="9" cy="6" r="1.9" fill="#e8112d" />
      <g stroke="#ffed00" strokeWidth="0.5">
        <line x1="9" y1="4.25" x2="9" y2="7.75" />
        <line x1="7.48" y1="5.12" x2="10.52" y2="6.88" />
        <line x1="10.52" y1="5.12" x2="7.48" y2="6.88" />
      </g>
    </>
  ),
  ru: (
    <>
      <rect width="18" height="4" fill="#fff" />
      <rect y="4" width="18" height="4" fill="#0039a6" />
      <rect y="8" width="18" height="4" fill="#d52b1e" />
    </>
  ),
  tk: (
    <>
      <rect width="18" height="12" fill="#00843d" />
      <rect x="2" width="2.6" height="12" fill="#d22630" />
      {[2, 5, 8, 11].map((y) => (
        <rect key={y} x="2.6" y={y - 0.55} width="1.4" height="1.1" fill="#f6c85f" />
      ))}
      <circle cx="8.4" cy="3.1" r="1.25" fill="#fff" />
      <circle cx="8.8" cy="3.1" r="1" fill="#00843d" />
      {[
        [10.4, 2.1],
        [11.4, 2.8],
        [10.4, 4.1],
        [11.8, 1.8],
        [12.2, 3.7],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.32" fill="#fff" />
      ))}
    </>
  ),
  tt: (
    <>
      <rect width="18" height="5.2" fill="#009444" />
      <rect y="5.2" width="18" height="1.6" fill="#fff" />
      <rect y="6.8" width="18" height="5.2" fill="#ee1c25" />
    </>
  ),
  uz: (
    <>
      <rect width="18" height="3.9" fill="#0099b5" />
      <rect y="3.9" width="18" height="0.55" fill="#ce1126" />
      <rect y="4.45" width="18" height="3.1" fill="#fff" />
      <rect y="7.55" width="18" height="0.55" fill="#ce1126" />
      <rect y="8.1" width="18" height="3.9" fill="#1eb53a" />
      <circle cx="2.9" cy="1.95" r="1.25" fill="#fff" />
      <circle cx="3.35" cy="1.95" r="1" fill="#0099b5" />
      {[
        [4.9, 1.1],
        [5.8, 1.9],
        [4.9, 2.8],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.3" fill="#fff" />
      ))}
    </>
  ),
}

export function LangFlag({ lang }: { lang: Lang }) {
  return <FlagSvg>{FLAGS[lang]}</FlagSvg>
}
