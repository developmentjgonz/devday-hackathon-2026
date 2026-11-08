'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'
import { headingVariants } from './typography'
import type { VariantProps } from 'class-variance-authority'

import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'
import '@/styles/dialog.css'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  motion = 'default',
  ...props
}: DialogPrimitive.Backdrop.Props & { motion?: 'default' | 'none' }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-foreground/25 supports-backdrop-filter:backdrop-blur-xs',
        motion === 'default' && 'duration-(--duration-normal) ease-(--ease-out) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeDisabled = false,
  size = 'default',
  layout = 'default',
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  closeDisabled?: boolean
  size?: 'default' | 'wide'
  layout?: 'default' | 'scroll'
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-layout={layout}
        className={cn(
          'group/dialog fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overscroll-contain rounded-surface border border-border bg-popover text-sm leading-6 text-popover-foreground duration-(--duration-normal) ease-(--ease-out) outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          layout === 'scroll' ? 'flex flex-col overflow-hidden' : 'mews-dialog-scroll grid gap-5 overflow-y-auto p-6',
          size === 'wide' ? 'sm:max-w-[min(48rem,calc(100%-2rem))]' : 'sm:max-w-md',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            disabled={closeDisabled}
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 pr-9 group-data-[layout=scroll]/dialog:shrink-0 group-data-[layout=scroll]/dialog:px-6 group-data-[layout=scroll]/dialog:pt-6 group-data-[layout=scroll]/dialog:pr-12 group-data-[layout=scroll]/dialog:pb-5', className)}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={cn('mews-dialog-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pb-6 [scrollbar-gutter:stable]', className)} {...props} />
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        '-mx-6 -mb-6 flex flex-col-reverse gap-2 border-t bg-muted/35 p-6 sm:flex-row sm:justify-end group-data-[layout=scroll]/dialog:mx-0 group-data-[layout=scroll]/dialog:mb-0 group-data-[layout=scroll]/dialog:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, size = 'section', ...props }: DialogPrimitive.Title.Props & VariantProps<typeof headingVariants>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(headingVariants({ size }), className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm leading-6 text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
