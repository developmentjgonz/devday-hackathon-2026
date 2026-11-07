export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-50 rounded-lg bg-foreground px-4 py-3 text-sm text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      Skip to content
    </a>
  )
}
