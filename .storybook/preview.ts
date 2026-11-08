import type { Preview } from '@storybook/react-vite'
import { createElement, Fragment } from 'react'
import { Toaster } from '../src/components/ui/toaster'
import '../src/styles/globals.css'

const preview: Preview = {
  decorators: [(Story) => createElement(Fragment, null, createElement(Story), createElement(Toaster))],
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    options: {
      storySort: { order: ['Gallery', 'Foundations', 'Actions', 'Forms', 'Feedback', 'Display', 'Overlays'] },
    },
  },
}

export default preview
