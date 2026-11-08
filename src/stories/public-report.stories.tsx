import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { PublicReportPage } from '@/features/public-reports/pages/public-report-page'

const meta = {
  title: 'Pages/Public report',
  component: PublicReportPage,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The public report flow. The app loads available options from the public contact endpoint, uses the AI chat when enabled, and sends reviewed reports to the inbox. Chat collects the city/area and landmark in conversation; the Worker searches for nearby places and returns up to three location choices, without an embedded search form. Both chat and form use CurrentLocationButton. The shared file picker supports attachment-only messages. Chat sends current files for AI review, shows read failures, and requires another review after files change. Final confirmation saves the originals with the report. Chat confirms that the shared position is where the cats were seen; the form displays device accuracy and sends the pin on submission. Address attribution stays beside suggested places. Both routes offer optional follow-up contact. Permission starts unchecked; choosing it reveals a recommended phone field and an email alternative. Turning permission off omits contact details from submission. Contact fields stay outside the AI conversation and survive form fallback and failed sends. Storybook browser checks provide isolated responses and simulated device positions.' } } },
} satisfies Meta<typeof PublicReportPage>
export default meta
type Story = StoryObj<typeof meta>
export const Form: Story = {}
export const Chat: Story = { args: { preferChat: true } }
