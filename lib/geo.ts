export type BrowserOrigin = { lat: number; lon: number }

export function canReadLocation() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.geolocation?.getCurrentPosition)
  )
}

export function readBrowserOrigin(timeoutMs = 3500): Promise<BrowserOrigin | null> {
  if (!canReadLocation()) return Promise.resolve(null)
  return new Promise((resolve) => {
    let done = false
    const finish = (value: BrowserOrigin | null) => {
      if (done) return
      done = true
      resolve(value)
    }
    const timer = window.setTimeout(() => finish(null), timeoutMs)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer)
          finish({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          })
        },
        () => {
          window.clearTimeout(timer)
          finish(null)
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 180_000 }
      )
    } catch {
      window.clearTimeout(timer)
      finish(null)
    }
  })
}

function openNamedWindow(
  url: string,
  name: string,
  existing?: Window | null
) {
  try {
    if (existing && !existing.closed) {
      existing.location.href = url
      existing.focus()
      return existing
    }
    return window.open(url, name)
  } catch {
    return null
  }
}

export function openMapsWindow(url: string, existing?: Window | null) {
  return openNamedWindow(url, "maya-maps", existing)
}

export function openYoutubeWindow(url: string, existing?: Window | null) {
  return openNamedWindow(url, "maya-youtube", existing)
}
