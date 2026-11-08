import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cn } from 'cn'

export function TextLink({ render, size = 'default', variant = 'default', className, ...props }: useRender.ComponentProps<'a'> & { size?: 'default' | 'sm'; variant?: 'default' | 'navigation' | 'skip' }) {
  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps<'a'>({ className: cn(
      'font-sans outline-none',
      variant === 'navigation' ? 'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=page]:bg-sidebar-accent aria-[current=page]:hover:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground' :
      variant === 'skip' ? 'sr-only z-50 rounded-control bg-foreground px-4 py-3 text-sm text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring' :
      'inline-flex min-h-11 items-center gap-2 rounded-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 aria-[current=page]:text-primary-text aria-[current=page]:hover:text-primary-text aria-[current=page]:underline aria-[current=page]:underline-offset-4',
      variant === 'default' && (size === 'sm' ? 'text-xs' : 'text-sm'), className,
    ) }, props),
  })
}
