import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'

function LegalPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <article className="landing-width py-12 sm:py-16">
      <title>{`${title} · Mews`}</title>
      <div className="mx-auto max-w-3xl">
        <TextLink render={<Link to="/" />}><ArrowLeft className="size-4" aria-hidden="true" />Back to home</TextLink>
        <Heading level={1} size="title" className="mt-6">{title}</Heading>
        {children ? <div className="mt-6 space-y-4">{children}</div> : null}
      </div>
    </article>
  )
}

export function PrivacyPage() {
  return <LegalPage title="Privacy Policy">
    <Text>When you use the report chat, your messages are sent to OpenAI to prepare your report. Your report is sent to the team when you confirm it.</Text>
    <Text>When you search for a location, your search is sent to the map provider shown with the search. If you send a map location, it is included with your report.</Text>
  </LegalPage>
}

export function TermsPage() {
  return <LegalPage title="Terms" />
}
