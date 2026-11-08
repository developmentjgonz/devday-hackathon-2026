import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { ChatCoordinates } from '../../../shared/schemas/public-report-chat'
import { Alert } from './alert'
import { Button } from './button'

/** Request a single device position only after the visitor presses the button. */
export function CurrentLocationButton({ disabled = false, onSelect, onLocatingChange }: {
  disabled?: boolean
  onSelect: (location: ChatCoordinates) => void
  onLocatingChange?: (busy: boolean) => void
}) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const pending = useRef(false)
  const callbacks = useRef({ onSelect, onLocatingChange })
  callbacks.current = { onSelect, onLocatingChange }

  useEffect(() => () => {
    request.current++
    if (pending.current) callbacks.current.onLocatingChange?.(false)
  }, [])
  useEffect(() => {
    if (disabled && pending.current) {
      request.current++
      pending.current = false
      setLocating(false)
      callbacks.current.onLocatingChange?.(false)
    }
  }, [disabled])

  function locate() {
    if (disabled || pending.current) return
    setError('')
    if (!navigator.geolocation) { setError('This browser cannot share your location. You can type an address or nearby landmark instead.'); return }
    const current = ++request.current
    pending.current = true
    setLocating(true)
    callbacks.current.onLocatingChange?.(true)
    function finish() {
      pending.current = false
      setLocating(false)
      callbacks.current.onLocatingChange?.(false)
    }
    navigator.geolocation.getCurrentPosition((position) => {
      if (request.current !== current) return
      finish()
      callbacks.current.onSelect({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
    }, (cause) => {
      if (request.current !== current) return
      finish()
      setError(cause.code === 1 ? 'Location access was not allowed. You can allow it in your browser settings, or type an address or landmark.'
        : cause.code === 3 ? 'Getting your location took too long. Try again, or type an address or landmark.'
          : 'Could not get your location. Try again, or type an address or landmark.')
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  return <div className="space-y-2">
    <Button type="button" variant="outline" size="sm" disabled={disabled} loading={locating} onClick={locate}><LocateFixed aria-hidden="true" />Use my current location</Button>
    {error ? <Alert>{error}</Alert> : null}
  </div>
}
