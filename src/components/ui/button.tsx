import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { LoadingIndicator } from './loading-indicator'
import { isValidElement } from 'react'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding font-heading text-sm font-semibold tracking-[0.01em] whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-ring dark:aria-invalid:focus-visible:ring-ring dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:border-ring aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:border-ring aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:border-ring aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive',
        link: 'text-primary-text underline-offset-4 hover:underline',
        selection: 'h-auto justify-between whitespace-normal border-border bg-card text-left font-sans font-normal hover:bg-muted aria-pressed:border-ring aria-pressed:bg-sidebar-accent aria-pressed:hover:bg-sidebar-accent',
        media: 'overflow-hidden bg-card p-0 hover:bg-muted',
        account: 'justify-start text-left font-sans font-normal hover:bg-muted aria-expanded:border-ring data-popup-open:border-ring data-popup-open:bg-muted',
        'table-header': 'justify-start rounded-sm font-sans font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
        'view-switcher': 'bg-transparent hover:bg-card/60 aria-pressed:border-border aria-pressed:bg-card aria-pressed:hover:bg-card',
      },
      size: {
        default:
          'h-(--control-height) gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-(--control-height-xs) gap-1 rounded-control px-2 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-(--control-height-sm) gap-1 rounded-control px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        segment: "h-(--control-height-xs) gap-1 rounded-control px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-(--control-height-lg) gap-2.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-(--control-height)',
        content: 'h-auto gap-3 p-4',
        media: 'h-auto gap-0 p-0',
        account: 'min-h-16 w-full gap-3 px-2.5 py-2',
        'icon-xs':
          "size-(--control-height-xs) rounded-control in-data-[slot=button-group]:rounded-control [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-(--control-height-sm) rounded-control in-data-[slot=button-group]:rounded-control',
        'icon-lg': 'size-(--control-height-lg)',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  children,
  disabled,
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  const link = isValidElement<{ href?: string; to?: unknown }>(render)
    && (render.type === 'a' || render.props.href !== undefined || render.props.to !== undefined)
  return (
    <ButtonPrimitive
      render={render}
      nativeButton={nativeButton ?? (!isValidElement(render) || render.type === 'button')}
      role={link ? 'link' : undefined}
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('relative', buttonVariants({ variant, size, className }), 'aria-busy:disabled:opacity-100 aria-busy:aria-disabled:opacity-100')}
      {...props}
    >
      <span
        data-slot="button-content"
        className={cn(
          'inline-flex min-w-0 items-center gap-[inherit] [justify-content:inherit]',
          (variant === 'selection' || variant === 'account' || variant === 'media') && 'flex-1',
          loading && 'opacity-0',
        )}
      >
        {children}
      </span>
      {loading ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LoadingIndicator decorative size="sm" />
        </span>
      ) : null}
    </ButtonPrimitive>
  )
}

function ButtonLabel({ children, labels }: { children: ReactNode; labels: readonly string[] }) {
  return (
    <span className="grid">
      {labels.map((label) => (
        <span key={label} aria-hidden="true" className="invisible col-start-1 row-start-1">
          {label}
        </span>
      ))}
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  )
}

export { Button, ButtonLabel, buttonVariants }
