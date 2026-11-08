import type { ComponentProps } from 'react'
import type { Button } from '../../components/ui/button'
import type { Badge } from '../../components/ui/badge'

type CompleteVariants<All, Cases extends readonly string[]> =
  [NonNullable<All>] extends [Cases[number]]
    ? Cases[number] extends NonNullable<All> ? Cases : never
    : never

const buttonCases = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link', 'selection', 'media', 'account', 'table-header'] as const
const badgeCases = ['default', 'secondary', 'outline', 'destructive', 'success', 'warning', 'ghost', 'link'] as const

// New or removed production variants must update the browser fixtures too.
export const buttonStateVariants: CompleteVariants<ComponentProps<typeof Button>['variant'], typeof buttonCases> = buttonCases
export const badgeStateVariants: CompleteVariants<ComponentProps<typeof Badge>['variant'], typeof badgeCases> = badgeCases

// Each shared source must have browser coverage or a reason it has no own states.
// The coverage test compares this list with the source directory.
export const sharedStateCoverage = {
  'data-table.tsx': 'Sorting, page size, pagination, selection, loading, retry, keyboard, and narrow widths in data-table.spec.ts.',
  'workspace-header.tsx': 'Page names, breadcrumbs, sticky actions, route changes, and narrow widths in workspace-header.spec.ts.',
  'account-button.tsx': 'Account trigger: popover open, hover, focus, Escape, and focus return.',
  'badge.tsx': 'All variants as links; plain spans must remain passive.',
  'button.tsx': 'Every variant: hover, focus, activation, disabled, and loading.',
  'card.tsx': 'Anchor rendering: hover does not imply selection; keyboard focus remains visible.',
  'checkbox.tsx': 'Checked, unchecked, invalid, disabled, keyboard, and touch.',
  'colony-map.tsx': 'Location selection and retry use RecordButton and Button; offline map story.',
  'dialog.tsx': 'Trigger, focus trap, close controls, Escape, and focus return.',
  'disclosure.tsx': 'Native summary hover, keyboard focus, and open state.',
  'drawer.tsx': 'Trigger, focus trap, close controls, Escape, and focus return.',
  'input.tsx': 'Default, invalid, disabled, hover, focus, and editing.',
  'map/map-canvas.tsx': 'Map zoom and retry compose Button; zoom controls tested with an offline map style.',
  'notification-button.tsx': 'Ghost icon button: hover, keyboard focus, and an accessible notification count.',
  'popover.tsx': 'Account trigger, open state, close control, Escape, and focus return.',
  'record-button.tsx': 'Selection transfer; current + hover, current + focus, and touch.',
  'report-list-item.tsx': 'Selection transfer; current + hover, current + focus, and disabled.',
  'select-field.tsx': 'Default, invalid, disabled, hover, focus, and value changes.',
  'table.tsx': 'Selected rows retain their fill on hover and focus within; open button has a focus ring.',
  'text-link.tsx': 'Default, small, current, navigation, and skip links.',
  'textarea.tsx': 'Default, invalid, disabled, hover, focus, and editing.',
  'view-tabs.tsx': 'Selected underline remains on hover and focus; arrow keys and touch change selection.',
  'workspace-navigation.tsx': 'Route selection, hover, keyboard, and touch in workspace-navigation.spec.ts.',
  'alert.tsx': 'Passive status content; actions use the tested Button or TextLink components.',
  'empty-state.tsx': 'Passive status content; actions use the tested Button component.',
  'label.tsx': 'Native field label; label activation is checked with form controls.',
  'loading-indicator.tsx': 'Passive status graphic; loading Button is disabled and cannot activate.',
  'loading-stages.tsx': 'Passive progress; aria-current="step" represents progress, not an interactive choice.',
  'separator.tsx': 'Passive separator; no hover, selection, or keyboard focus.',
  'skeleton.tsx': 'Passive loading shape; no hover, selection, or keyboard focus.',
  'typography.tsx': 'Passive text by default; custom anchor rendering has a native focus outline.',
} as const
