import { useId, type ComponentProps } from 'react'

/** Shared brand artwork used by the public pages and Storybook. */
export function CommunityCat({ className, ...props }: ComponentProps<'svg'>) {
  const titleId = useId()
  return (
    <svg viewBox="0 0 600 570" fill="none" role="img" aria-labelledby={titleId} className={className} {...props}>
      <title id={titleId}>A black cat and an orange kitten beside a food bowl and an olive plant</title>
      <path d="M111 385V245C111 142 190 75 294 75s192 79 192 182v153Z" fill="var(--secondary)" />
      <ellipse cx="310" cy="490" rx="260" ry="28" fill="var(--cream-200)" />
      <path d="M397 439c95-6 113-81 77-123-25-28-9-57 10-46 56 33 73 111 36 161-29 39-78 47-123 40" fill="var(--foreground)" />
      <path d="M151 447c-8-72 12-139 65-160 42-17 105-8 139 43 16 24 25 57 23 83 36 0 52 17 43 38-4 12-19 19-46 19H180c-33 0-47-10-43-20 2-5 7-5 14-3Z" fill="var(--foreground)" />
      <path d="m167 254-8-89c-1-10 6-14 15-8l56 39c25-8 47-8 71-1l55-39c8-6 16-1 15 9l-8 94c0 56-42 96-97 96-61 0-103-39-99-101Z" fill="var(--foreground)" />
      <path d="m178 215-4-36 31 25M324 203l31-25-4 38" fill="var(--secondary)" />
      <ellipse cx="221" cy="257" rx="24" ry="28" fill="var(--cream-50)" /><ellipse cx="307" cy="257" rx="24" ry="28" fill="var(--cream-50)" />
      <ellipse cx="229" cy="258" rx="8" ry="17" fill="var(--foreground)" /><ellipse cx="299" cy="258" rx="8" ry="17" fill="var(--foreground)" />
      <path d="m257 281 9 8 9-8" fill="var(--secondary)" stroke="var(--secondary)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M266 290v7m0 0c-7 10-15 8-19 2m19-2c7 10 15 8 19 2" stroke="var(--cream-50)" strokeWidth="3" strokeLinecap="round" />
      <path d="m198 286-38-7m36 19-33 5m170-17 38-7m-36 19 33 5" stroke="var(--cream-50)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M218 345c4 34 4 69-7 100m85-100c-4 34-4 69 7 100" stroke="var(--cream-50)" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
      <path d="M185 451h33m73 0h33" stroke="var(--cream-50)" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
      <path d="M107 473c-24 6-40-2-40-20 0-11 7-21 15-23 6-2 11 1 11 6 0 4-4 7-7 10-9 11-1 23 19 22Z" fill="var(--primary)" />
      <path d="M104 414c-9 7-14 18-14 34 0 19 5 30 23 30h43c9 0 13-6 13-16v-29c0-12-5-20-14-25Z" fill="var(--primary)" />
      <path d="M104 415c-9-4-14-12-14-23l-1-6-9-13c-5-8-1-12 6-11l17 4c7-6 16-9 25-10l16-14c6-6 11-4 13 4l4 15c8 6 12 15 13 25 1 14-5 23-17 29-15 8-39 8-53 0Z" fill="var(--primary)" />
      <path d="m87 369 8 12 7-8Zm60-21-8 10 14 3Z" fill="var(--cream-50)" />
      <ellipse cx="126" cy="385" rx="10" ry="11" fill="var(--cream-50)" /><ellipse cx="151" cy="374" rx="9" ry="11" fill="var(--cream-50)" />
      <ellipse cx="129" cy="382" rx="4.5" ry="5.5" fill="var(--foreground)" /><ellipse cx="154" cy="371" rx="4.5" ry="5.5" fill="var(--foreground)" />
      <path d="m145 390 5 3 3-5Z" fill="var(--secondary)" stroke="var(--secondary)" strokeWidth="2" strokeLinejoin="round" />
      <path d="m150 393 1 4m0 0c-2 4-5 5-8 3m8-3c3 3 6 3 8 0" stroke="var(--cream-50)" strokeWidth="2" strokeLinecap="round" />
      <path d="m119 399-12 4m13 1-10 7m54-22 12-7m-10 12 13-2" stroke="var(--cream-50)" strokeWidth="2" strokeLinecap="round" />
      <path d="M130 434c1 8 2 14 2 21m19-22c-2 8-3 15-3 22m-42-14c6 3 8 8 8 14" stroke="var(--cream-50)" strokeWidth="2" strokeLinecap="round" />
      <path d="M418 421c5-55 20-98 29-159m-20 118c-32-18-49-42-43-66 28 5 42 28 43 66Zm9-43c-3-36 9-62 33-71 13 26-1 51-33 71Z" fill="var(--success-foreground)" />
      <path d="M431 355c23-34 47-49 67-40-6 28-27 42-67 40Zm14-66c-17-23-23-49-8-66 19 13 24 35 8 66Z" fill="var(--success-foreground)" />
      <path d="m403 410 8 61c1 13 51 13 53 0l8-61" fill="var(--primary)" /><rect x="398" y="403" width="79" height="17" rx="5" fill="var(--primary)" />
      <path d="M113 455h129l-12 35c-5 15-98 15-104 0Z" fill="var(--primary)" /><ellipse cx="178" cy="456" rx="65" ry="12" fill="var(--primary-hover)" /><ellipse cx="178" cy="454" rx="48" ry="7" fill="var(--foreground)" />
      <g fill="var(--cream-200)"><circle cx="153" cy="454" r="3" /><circle cx="167" cy="451" r="3" /><circle cx="179" cy="455" r="3" /><circle cx="191" cy="451" r="3" /><circle cx="204" cy="454" r="3" /></g>
      <path d="M177 479c-14-17-23 0 0 10 24-10 14-27 0-10Z" fill="var(--cream-50)" />
      <path d="M101 239c-20-28-43-3-3 16 43-22 16-45 3-16Z" fill="var(--primary)" />
      <path d="m470 169 5 12 12 5-12 5-5 12-5-12-12-5 12-5ZM100 322l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="var(--foreground)" />
      <path d="M81 409c-16-17-26-33-24-48m-2 9-6-10m19 15 3-9" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
