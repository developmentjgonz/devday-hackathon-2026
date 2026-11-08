import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { TextLink } from '@/components/ui/text-link'
import { Heading } from '@/components/ui/typography'

function LegalPage({ title }: { title: string }) {
  return (
    <article className="landing-width py-12 sm:py-16">
      <title>{`${title} · Mews`}</title>
      <div className="mx-auto max-w-3xl">
        <TextLink render={<Link to="/" />}><ArrowLeft className="size-4" aria-hidden="true" />Back to home</TextLink>
        <Heading level={1} size="title" className="mt-6">{title}</Heading>
      </div>
    </article>
  )
}

export function PrivacyPage() {
  return <LegalPage title="Privacy Policy" />
}

export function TermsPage() {
  return <LegalPage title="Terms" />
}
