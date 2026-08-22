export type AtmosphereId = "hearth" | "veil" | "ink"

export type Atmosphere = {
  id: AtmosphereId
  label: string
  promise: string
  swatch: string
}

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "hearth",
    label: "Hearth",
    promise: "Warm lamp. Tea-dark. The room you already have.",
    swatch: "oklch(0.76 0.12 62)",
  },
  {
    id: "veil",
    label: "Veil",
    promise: "Indigo dusk. A quiet occult sage. Less tea, more threshold.",
    swatch: "oklch(0.74 0.14 304)",
  },
  {
    id: "ink",
    label: "Ink",
    promise: "Near-black, one moon-gold thread. Spare. A closed book.",
    swatch: "oklch(0.78 0.09 88)",
  },
]

export const DEFAULT_ATMOSPHERE: AtmosphereId = "hearth"

export function isAtmosphere(value: unknown): value is AtmosphereId {
  return value === "hearth" || value === "veil" || value === "ink"
}

export function atmosphereClass(id: AtmosphereId) {
  return `atmosphere-${id}`
}
