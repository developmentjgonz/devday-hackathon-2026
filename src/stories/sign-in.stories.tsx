import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AccountLayout } from '@/components/layout/account-layout'
import { SignInScreen } from '@/features/auth/components/sign-in-screen'

const meta = {
  title: 'Pages/Sign in',
  component: SignInScreen,
  decorators: [(Story) => <MemoryRouter initialEntries={['/sign-in']}><Routes><Route element={<AccountLayout />}><Route path="*" element={<Story />} /></Route></Routes></MemoryRouter>],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The same SignInScreen and AccountLayout used by the app. Fictional account data stays in this story. Selecting an account shows the error state locally; no sign-in or account requests are made. Real navigation and sign-in are checked in the app.' } },
  },
  args: {
    localSignInEnabled: true,
    demoSignInEnabled: false,
    demoAdminSignInEnabled: false,
    googleSignInEnabled: false,
    users: [
      { id: 'story-admin', name: 'Alex Morgan', email: 'admin@mews.test', role: 'administrator', status: 'active' },
      { id: 'story-member', name: 'Sam Rivera', email: 'member@mews.test', role: 'member', status: 'active' },
      { id: 'story-pending', name: 'Jordan Lee', email: 'pending@mews.test', role: 'member', status: 'pending' },
    ],
    selected: null,
    error: '',
    onSignIn: () => undefined,
    onDemoAdminSignIn: () => undefined,
  },
  argTypes: { onSignIn: { control: false }, onDemoAdminSignIn: { control: false }, users: { control: false } },
  render: function Render(args) {
    const [error, setError] = useState('')
    return <SignInScreen {...args} error={args.error || error} onSignIn={() => setError('We could not sign in. Try again.')} onDemoAdminSignIn={() => setError('The administrator code is not valid.')} />
  },
} satisfies Meta<typeof SignInScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const SigningIn: Story = { args: { selected: 'story-member' } }
export const Error: Story = { args: { error: 'We could not sign in. Try again.' } }
export const ContactAdministrator: Story = { args: { localSignInEnabled: false } }
export const GoogleSignIn: Story = { args: { localSignInEnabled: false, googleSignInEnabled: true } }
export const DemoSignIn: Story = { args: { localSignInEnabled: false, demoSignInEnabled: true, googleSignInEnabled: true, users: [{ id: 'story-member', name: 'Sam Rivera', email: 'member@mews.test', role: 'member', status: 'active' }] } }
export const DemoAdministrator: Story = { args: { ...DemoSignIn.args, demoAdminSignInEnabled: true, users: [
  { id: 'story-admin', name: 'Alex Morgan', email: 'admin@mews.test', role: 'administrator', status: 'active' },
  { id: 'story-member', name: 'Sam Rivera', email: 'member@mews.test', role: 'member', status: 'active' },
] }, parameters: { docs: { description: { story: 'The code-protected administrator has full team, configuration, AI analysis, and autopilot access. The production account requires the private administrator code. Ordinary demo members cannot use AI or become administrators.' } } } }
