import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 font-sans leading-5 font-semibold whitespace-nowrap underline-offset-4 [&:is(a,button)]:hover:underline transition-colors duration-(--duration-fast) focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-ring dark:aria-invalid:focus-visible:ring-ring dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      size: { default: 'h-6 text-xs', comfortable: 'h-7 text-sm' },
      variant: {
        default: 'bg-primary text-primary-foreground [&:is(a,button)]:hover:bg-primary/80',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        secondary:
          'bg-secondary text-secondary-foreground [&:is(a,button)]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive dark:bg-destructive/20 dark:focus-visible:ring-destructive [&:is(a,button)]:hover:bg-destructive/20',
        outline:
          'border-border text-foreground [&:is(a,button)]:hover:bg-muted [&:is(a,button)]:hover:text-muted-foreground',
        ghost:
          '[&:is(a,button)]:hover:bg-muted [&:is(a,button)]:hover:text-muted-foreground dark:[&:is(a,button)]:hover:bg-muted/50',
        link: 'text-primary-text underline-offset-4 [&:is(a,button)]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
