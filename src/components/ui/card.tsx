import * as React from 'react'
import { cn } from 'cn'
import { headingVariants } from './typography'
import { useRender } from '@base-ui/react/use-render'
import { mergeProps } from '@base-ui/react/merge-props'

function Card({
  className,
  size = 'default',
  padding = 'default',
  tone = 'default',
  interactive = false,
  render,
  ...props
}: useRender.ComponentProps<'div'> & { size?: 'default' | 'sm'; padding?: 'default' | 'none'; tone?: 'default' | 'note'; interactive?: boolean }) {
  return useRender({
    defaultTagName: 'div', render,
    props: { ...mergeProps<'div'>({
      className: cn(
        'group/card flex flex-col overflow-hidden border text-sm leading-6 text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [--card-spacing:--spacing(6)] data-[size=sm]:[--card-spacing:--spacing(4)]',
        tone === 'note' ? 'rounded-control border-note-border bg-note shadow-sm' : 'rounded-surface border-border bg-card',
        interactive && (tone === 'note' ? 'cursor-pointer transition-colors duration-(--duration-fast) hover:bg-note/80' : 'cursor-pointer transition-colors duration-(--duration-fast) hover:bg-muted/50'),
        padding === 'none' ? 'gap-0 py-0' : 'gap-(--card-spacing) py-(--card-spacing) has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0', className,
      ),
    }, props), 'data-slot': 'card', 'data-size': size, 'data-tone': tone },
  })
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        headingVariants({ size: 'card' }),
        'group-data-[size=sm]/card:text-base',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  )
}

function CardList({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="card-list" className={cn('divide-y divide-border', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center border-t bg-muted/50 p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardList,
}
