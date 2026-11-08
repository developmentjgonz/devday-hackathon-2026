import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { useEffect, useState, type ReactNode } from 'react'
import { LoadingIndicator } from './loading-indicator'
import { isValidElement } from 'react'
import { navigationItemStyles } from './navigation-styles'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-heading text-sm font-semibold tracking-[0.01em] whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-ring dark:aria-invalid:focus-visible:ring-ring dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        'chat-send': 'rounded-full bg-foreground text-background hover:bg-foreground/85 focus-visible:border-foreground focus-visible:ring-foreground/30 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:border-ring aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:border-ring aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        subtle:
          'border-border bg-muted text-foreground hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_8%)] aria-expanded:border-ring',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:border-ring aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive-surface text-destructive hover:bg-destructive-surface-hover focus-visible:border-destructive/40 focus-visible:ring-destructive',
        link: 'text-primary-text underline-offset-4 hover:underline',
        selection: 'h-auto justify-between whitespace-normal border-border bg-card text-left font-sans font-normal hover:bg-muted aria-pressed:border-ring aria-pressed:bg-sidebar-accent aria-pressed:hover:bg-sidebar-accent',
        media: 'overflow-hidden bg-card p-0 hover:bg-muted',
        bubble: 'rounded-full border-card bg-card p-0 shadow-sm hover:border-ring hover:bg-card',
        account: 'justify-start text-left font-sans font-normal hover:bg-muted aria-expanded:border-ring data-popup-open:border-ring data-popup-open:bg-muted',
        'table-header': 'justify-start rounded-sm font-sans font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
        'view-switcher': 'bg-transparent hover:bg-card/60 aria-pressed:border-border aria-pressed:bg-card aria-pressed:hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/70',
        navigation: '',
      },
      size: {
        default:
          'h-(--control-height) gap-2 rounded-control px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-(--control-height-xs) gap-1 rounded-control px-2 text-xs in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-(--control-height-sm) gap-1 rounded-control px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-control has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        segment: "h-(--control-height-xs) gap-1 rounded-[calc(var(--control-radius)-var(--spacing))] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-(--control-height-lg) gap-2.5 rounded-control px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-(--control-height) rounded-control',
        content: 'h-auto gap-3 rounded-control p-4',
        media: 'h-auto gap-0 rounded-control p-0',
        bubble: 'size-16 gap-0 rounded-full p-0',
        account: 'min-h-16 w-full gap-3 rounded-control px-2.5 py-2',
        'icon-xs':
          "size-(--control-height-xs) rounded-control in-data-[slot=button-group]:rounded-control [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-(--control-height-sm) rounded-control in-data-[slot=button-group]:rounded-control',
        'icon-lg': 'size-(--control-height-lg) rounded-control',
        'icon-group': 'size-(--control-height) rounded-none focus-visible:z-10 focus-visible:ring-inset',
        'dialog-close': 'size-(--control-height-sm) [--dialog-close-inset:calc(var(--spacing)*3)] rounded-[max(0px,calc(var(--surface-radius)-var(--dialog-close-inset)-1px))]',
      },
    },
    compoundVariants: [{ variant: 'navigation', className: `${navigationItemStyles} border-0 active:not-aria-[haspopup]:scale-100` }, { variant: 'chat-send', className: 'rounded-full' }],
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
  const [keepLoader, setKeepLoader] = useState(loading)
  useEffect(() => {
    if (loading) { setKeepLoader(true); return }
    if (!keepLoader) return
    const timer = setTimeout(() => setKeepLoader(false), 140)
    return () => clearTimeout(timer)
  }, [loading, keepLoader])
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
          'inline-flex min-w-0 items-center gap-[inherit] [justify-content:inherit] transition-opacity duration-150 ease-out motion-reduce:transition-none',
          (variant === 'selection' || variant === 'account' || variant === 'media') && 'flex-1',
          loading && 'opacity-0',
        )}
      >
        {children}
      </span>
      {loading || keepLoader ? (
        <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none', loading ? 'opacity-100' : 'opacity-0')}>
          <LoadingIndicator decorative size="sm" paused={!loading} />
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
