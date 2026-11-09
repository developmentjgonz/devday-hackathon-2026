---
title: Use Transitions for Suitable Render Updates
impact: LOW
impactDescription: reduces re-renders and improves code clarity
tags: rendering, transitions, useTransition, loading, state
---

## Use Transitions for Suitable Render Updates

Use `useTransition` for nonurgent render updates whose pending state belongs to a transition. Keep explicit request state when it controls retries, cancellation, deduplication, or request ordering. A transition does not replace these controls. State updates after an `await` need another `startTransition` call to mark them as transition updates.

**Manual request state (incomplete error and ordering handling):**

```tsx
function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (value: string) => {
    setIsLoading(true)
    setQuery(value)
    const data = await fetchResults(value)
    setResults(data)
    setIsLoading(false)
  }

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isLoading && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

**Transition pending state (request cancellation and ordering still required):**

```tsx
import { useTransition, useState } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value) // Update input immediately
    
    startTransition(async () => {
      // Fetch and update results
      const data = await fetchResults(value)
      // Use a request-order guard or cancellation when requests can overlap.
      startTransition(() => setResults(data))
    })
  }

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

**Benefits:**

- **Transition pending state**: `isPending` tracks the transition; keep separate request state when needed
- **Error resilience**: Pending state correctly resets even if the transition throws
- **Better responsiveness**: Keeps the UI responsive during updates
- **Interrupt handling**: React can interrupt transition rendering. Network side effects continue unless explicitly canceled, and awaited requests can finish out of order

Reference: [useTransition](https://react.dev/reference/react/useTransition)
