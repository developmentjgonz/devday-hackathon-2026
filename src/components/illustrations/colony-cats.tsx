import { useId, type ComponentProps } from 'react'

/** Brand artwork for a colony without a photo. */
export function ColonyCats({ className, ...props }: ComponentProps<'svg'>) {
  const titleId = useId()
  return (
    <svg viewBox="0 0 160 160" fill="none" role="img" aria-labelledby={titleId} className={className} {...props}>
      <title id={titleId}>A family of cats together by a food bowl</title>
      <path d="M21 119V67c0-31 24-50 59-50s59 20 59 51v51Z" fill="var(--secondary)" />
      <ellipse cx="80" cy="133" rx="65" ry="7" fill="var(--cream-200)" />

      {/* The larger cat sits behind the two smaller cats. */}
      <path d="M57 121c-2-18 4-33 14-38 6-3 13-3 19 0 11 5 17 20 15 38 5 1 8 4 6 7-1 2-4 3-9 3H58c-6 0-9-1-10-3-1-3 3-6 9-7Z" fill="var(--ink-900)" />
      <path d="m57 69-2-23c0-3 2-4 4-2l11 7a38 38 0 0 1 20 0l11-7c2-2 4-1 4 2l-2 23c1 17-9 27-23 27S56 86 57 69Z" fill="var(--ink-900)" />
      <path d="m60 61-1-11 9 6m24 0 9-6-1 11" fill="var(--pink-400)" />
      <ellipse cx="70" cy="70" rx="5" ry="6" fill="var(--cream-50)" />
      <ellipse cx="90" cy="70" rx="5" ry="6" fill="var(--cream-50)" />
      <ellipse cx="71" cy="70" rx="1.7" ry="3.5" fill="var(--ink-900)" />
      <ellipse cx="89" cy="70" rx="1.7" ry="3.5" fill="var(--ink-900)" />
      <path d="m77 78 3 3 3-3Z" fill="var(--pink-400)" />
      <path d="M80 81v2m0 0c-2 2-4 2-5 0m5 0c2 2 4 2 5 0m-19-3-8-2m8 5-7 1m35-4 8-2m-8 5 7 1" stroke="var(--cream-50)" strokeWidth="1" strokeLinecap="round" />

      {/* A cream kitten and an orange kitten sit close to the larger cat. */}
      <path d="M27 121c-1-13 3-22 11-26 5-2 11-2 16 0 8 4 12 13 11 26 4 1 6 3 5 5-1 3-4 4-8 4H31c-6 0-8-2-8-4 0-2 2-4 4-5Z" fill="var(--cream-50)" stroke="var(--ink-900)" strokeWidth="1.5" />
      <path d="m30 87-1-15c0-2 1-3 3-2l8 5a25 25 0 0 1 13 0l7-5c2-1 3 0 3 2l-1 15c1 12-6 20-16 20S29 99 30 87Z" fill="var(--cream-50)" stroke="var(--ink-900)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m33 81-1-7 6 4m17 0 5-4-1 7" fill="var(--pink-400)" />
      <ellipse cx="40" cy="88" rx="2" ry="3" fill="var(--ink-900)" />
      <ellipse cx="53" cy="88" rx="2" ry="3" fill="var(--ink-900)" />
      <path d="m44 94 2 2 2-2Z" fill="var(--pink-400)" />
      <path d="M46 96v2m0 0c-1 2-3 2-4 0m4 0c1 2 3 2 4 0m-15-2-6-1m6 4-6 1m28-4 6-1m-6 4 6 1" stroke="var(--ink-900)" strokeWidth="1" strokeLinecap="round" />

      <path d="M95 121c-1-13 3-22 11-26 5-2 11-2 16 0 8 4 12 13 11 26 3 1 5 3 5 5 0 3-3 4-8 4H99c-5 0-8-1-9-4-1-2 1-4 5-5Z" fill="var(--primary)" stroke="var(--ink-900)" strokeWidth="1.5" />
      <path d="m98 87-1-15c0-2 1-3 3-2l8 5a25 25 0 0 1 13 0l7-5c2-1 3 0 3 2l-1 15c1 12-6 20-16 20s-17-8-16-20Z" fill="var(--primary)" stroke="var(--ink-900)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m101 81-1-7 6 4m17 0 5-4-1 7" fill="var(--cream-50)" />
      <ellipse cx="108" cy="88" rx="2" ry="3" fill="var(--ink-900)" />
      <ellipse cx="121" cy="88" rx="2" ry="3" fill="var(--ink-900)" />
      <path d="m112 94 2 2 2-2Z" fill="var(--cream-50)" />
      <path d="M114 96v2m0 0c-1 2-3 2-4 0m4 0c1 2 3 2 4 0m-15-2-6-1m6 4-6 1m28-4 6-1m-6 4 6 1" stroke="var(--ink-900)" strokeWidth="1" strokeLinecap="round" />

      <path d="M67 127h26l-3 9c-1 4-19 4-20 0Z" fill="var(--primary)" />
      <ellipse cx="80" cy="127" rx="13" ry="3" fill="var(--primary-hover)" />
      <ellipse cx="80" cy="127" rx="9" ry="1.5" fill="var(--ink-900)" />
      <path d="M80 133c-3-3-5 0 0 2 5-2 3-5 0-2Z" fill="var(--cream-50)" />
      <path d="M30 47c-5-7-11-1-1 4 11-5 4-11 1-4Z" fill="var(--primary)" />
      <path d="m129 42 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="var(--ink-900)" />
    </svg>
  )
}
