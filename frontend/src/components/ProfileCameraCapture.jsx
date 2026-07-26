import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

/**
 * Live camera capture for profile photo.
 * Asks for camera input, shows preview, snaps a square-fitted frame.
 */
export default function ProfileCameraCapture({ onCapture, onCancel, onBlocked }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const onBlockedRef = useRef(onBlocked)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [snapping, setSnapping] = useState(false)

  useEffect(() => {
    onBlockedRef.current = onBlocked
  }, [onBlocked])

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available in this browser.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        setReady(true)
      } catch (err) {
        if (cancelled) return
        const blocked =
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          err?.name === 'SecurityError'
        if (blocked && onBlockedRef.current) {
          onBlockedRef.current()
          return
        }
        setError(
          blocked
            ? 'Camera access was blocked. Allow camera in site settings and try again.'
            : err?.message || 'Could not open the camera.',
        )
      }
    }

    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function snap() {
    const video = videoRef.current
    if (!video || !ready || snapping) return
    setSnapping(true)
    try {
      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 640
      const side = Math.min(vw, vh)
      const sx = Math.max(0, Math.floor((vw - side) / 2))
      const sy = Math.max(0, Math.floor((vh - side) / 2))
      const out = 320
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      // Mirror so the result matches the mirrored preview (selfie feel)
      ctx.translate(out, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, sx, sy, side, side, 0, 0, out, out)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      stopStream()
      onCapture(dataUrl)
    } catch (err) {
      setError(err?.message || 'Could not take that photo.')
      setSnapping(false)
    }
  }

  function handleCancel() {
    stopStream()
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border border-border bg-card p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-capture-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="camera-capture-title" className="font-display text-lg text-ink">
            Take a photo
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full p-1.5 text-muted outline-none hover:bg-page hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-full bg-page ring-2 ring-border">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!ready && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-page/80 text-sm text-muted">
              Asking for camera…
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-urgent" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-muted">
            Center your face in the circle, then capture.
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-[10px] px-4 py-2 text-sm text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || Boolean(error) || snapping}
            onClick={snap}
            className="inline-flex items-center gap-2 rounded-full bg-trail-gold px-5 py-2.5 text-sm font-medium text-ink outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
          >
            <Camera size={16} aria-hidden="true" />
            {snapping ? 'Saving…' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  )
}
