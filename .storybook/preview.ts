import type { Preview } from '@storybook/react-vite'
import '../src/styles/globals.css'

const preview: Preview = {
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
