import type { Preview } from '@storybook/react-vite'
import '../src/styles/globals.css'

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    options: {
      storySort: { order: ['Actions', 'Forms', 'Display', 'Overlays'] },
    },
  },
}

export default preview
