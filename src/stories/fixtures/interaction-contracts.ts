import type { ComponentProps } from 'react'
import type { Button } from '../../components/ui/button'
import type { Badge } from '../../components/ui/badge'

type CompleteVariants<All, Cases extends readonly string[]> =
  [NonNullable<All>] extends [Cases[number]]
    ? Cases[number] extends NonNullable<All> ? Cases : never
    : never

const buttonCases = ['default', 'chat-send', 'outline', 'secondary', 'subtle', 'ghost', 'destructive', 'link', 'selection', 'media', 'bubble', 'account', 'table-header', 'view-switcher', 'navigation'] as const
const badgeCases = ['default', 'secondary', 'outline', 'destructive', 'success', 'warning', 'ghost', 'link'] as const

// New or removed production variants must update the browser fixtures too.
export const buttonStateVariants: CompleteVariants<ComponentProps<typeof Button>['variant'], typeof buttonCases> = buttonCases
export const badgeStateVariants: CompleteVariants<ComponentProps<typeof Badge>['variant'], typeof badgeCases> = badgeCases

// Each shared source must have browser coverage or a reason it has no own states.
// The coverage test compares this list with the source directory.
export const sharedStateCoverage = {
  'current-location-button.tsx': 'Shared Button loading and disabled states; confirmation, denied permission, late results, and form fallback in public-report-chat.spec.ts.',
  'address-search-field.tsx': 'Shared query, delayed results, selection, errors, cancellation, keyboard, and loading in address-search.spec.ts and google-place-search.spec.ts.',
  'address-search.tsx': 'Address lookup, manual coordinates, errors, and saved addresses in address-search.spec.ts and colony-address.spec.ts.',
  'attachment-upload.tsx': 'File selection, limits, removal, send state, and retry in public-report-chat.spec.ts and public-report-contact.spec.ts.',
  'chat-composer.tsx': 'Empty, sending, keyboard submit, phone placement, and failure recovery in public-report-chat.spec.ts.',
  'content-swap.tsx': 'Report form, busy state, success, stable height, and reduced motion in public-report-chat.spec.ts.',
  'discard-changes-dialog.tsx': 'Keep editing, discard, focus, and navigation protection in drawer-consistency.spec.ts and mobile-polish.spec.ts.',
  'google-maps-attribution.tsx': 'Passive renderer attribution; preserve its text and links. It has no selection or custom action state.',
  'google-place-search.tsx': 'Typed search, shared sessions, delayed provider results, cancellation, and error recovery in google-place-search.spec.ts and google-place-loading.spec.ts.',
  'location-picker.tsx': 'Device location, searched addresses, manual coordinates, clear, cancellation, and failed saves in colony-address.spec.ts and colony-location.spec.ts.',
  'map/google-map.tsx': 'Provider-owned map rendering; shared buttons handle retry. Provider failure and place selection are covered by the Google Maps experiments and location checks.',
  'map/location-picker-map.tsx': 'Map selection composes the shared map and location form; selected coordinates, provider failure, and retry are covered in colony-location.spec.ts.',
  'photo-upload.tsx': 'Photo selection, replacement, removal, invalid files, loading, and narrow-layout checks in profile.spec.ts, cat-profiles.spec.ts, and mobile-polish.spec.ts.',
  'switch.tsx': 'Checked, unchecked, disabled, label activation, and extended touch area in configuration.spec.ts and mobile-polish.spec.ts.',
  'record-list.tsx': 'Shared record actions, keyboard access, long content, incremental loading and focus in mobile-workspace.spec.ts; Display/Record list shows empty and long-content states.',
  'bar-chart.tsx': 'Read-only comparison and long labels in Display/Bar chart; overview-progress.spec.ts checks live task updates and the empty state.',
  'user-avatar.tsx': 'Decorative photo and initials in three sizes; profile.spec.ts checks photo fallback.',
  'progress-ring.tsx': 'Determinate, completed, zero, and empty totals in Feedback/Progress ring; task and report counts update in overview-progress.spec.ts.',
  'record-avatar.tsx': 'Passive photo with cat and colony fallback; photo failure is checked in record-avatar.spec.ts.',
  'view-switcher.tsx': 'Selection, hover, and keyboard focus are checked in view-switcher.spec.ts; task filters and selection are covered in my-tasks.spec.ts.',
  'toaster.tsx': 'Sonner owns notification stacking, dismissal, and announcements; Feedback/Notifications demonstrates success and error. Report action checks cover emitted confirmations.',
  'attachment-list.tsx': 'Attachment actions compose the shared Button; attachment stories cover photos, audio, documents, and unavailable previews.',
  'data-table-toolbar.tsx': 'Search, colony filtering, clear filters, and selection actions in data-table.spec.ts; compact fields compose the tested shared Input and SelectField.',
  'data-table.tsx': 'Sorting, page size, pagination, selection, loading, retry, keyboard, and narrow widths in data-table.spec.ts.',
  'workspace-header.tsx': 'Page names, breadcrumbs, sticky positioning, route changes, and narrow widths in workspace-header.spec.ts.',
  'account-button.tsx': 'Account trigger: popover open, hover, focus, Escape, and focus return.',
  'badge.tsx': 'All variants as links; plain spans must remain passive.',
  'button.tsx': 'Every variant: hover, focus, activation, disabled, and loading.',
  'card.tsx': 'Anchor rendering and interactive record-card hover and focus are checked in shared-components and colonies-and-cats specs. Note surfaces appear in My Tasks light and dark layout checks.',
  'checkbox.tsx': 'Checked, unchecked, invalid, disabled, keyboard, and touch.',
  'colony-map.tsx': 'Location selection and retry use RecordButton and Button; offline map story.',
  'colony-bubble-chart.tsx': 'Linked colony and cat circles, empty colonies, and large groups in Display/Colony bubble chart.',
  'tooltip.tsx': 'Hover, keyboard focus, and Escape are covered in the colony bubble chart browser checks.',
  'dialog.tsx': 'Trigger, focus trap, close controls, Escape, and focus return.',
  'disclosure.tsx': 'Native summary hover, keyboard focus, and open state.',
  'drawer.tsx': 'Trigger, focus trap, close controls, Escape, and focus return.',
  'input.tsx': 'Default, invalid, disabled, hover, focus, and editing.',
  'map/map-canvas.tsx': 'Map zoom and retry compose Button; zoom controls tested with an offline map style.',
  'popover.tsx': 'Account trigger, open state, close control, Escape, and focus return.',
  'record-button.tsx': 'Selection transfer; current + hover, current + focus, and touch.',
  'report-list-item.tsx': 'Selection transfer; current + hover, current + focus, and disabled.',
  'select-field.tsx': 'Default, invalid, disabled, hover, focus, and value changes.',
  'table.tsx': 'Selected rows retain their fill on hover and focus within; open button has a focus ring.',
  'text-link.tsx': 'Default, small, underlined, current, navigation, and skip links.',
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
