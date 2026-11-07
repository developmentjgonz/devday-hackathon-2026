import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cn } from 'cn'

export function TextLink({ render, size = 'default', className, ...props }: useRender.ComponentProps<'a'> & { size?: 'default' | 'sm' }) {
  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps<'a'>({ className: cn('inline-flex min-h-11 items-center gap-2 rounded-sm font-sans font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 aria-[current=page]:text-primary-text aria-[current=page]:underline aria-[current=page]:underline-offset-4', size === 'sm' ? 'text-xs' : 'text-sm', className) }, props),
  })
}
