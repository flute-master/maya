export type AtmosphereId = "hearth" | "veil" | "ink"

export type Atmosphere = {
  id: AtmosphereId
  label: string
  promise: string
}

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "hearth",
    label: "Hearth",
    promise: "Warm lamp. Tea-dark. The room you already have.",
  },
  {
    id: "veil",
    label: "Veil",
    promise: "Indigo dusk. A quiet occult sage. Less tea, more threshold.",
  },
  {
    id: "ink",
    label: "Ink",
    promise: "Near-black, one moon-gold thread. Spare. A closed book.",
  },
]

export const DEFAULT_ATMOSPHERE: AtmosphereId = "hearth"

export function isAtmosphere(value: unknown): value is AtmosphereId {
  return value === "hearth" || value === "veil" || value === "ink"
}

export function atmosphereClass(id: AtmosphereId) {
  return `atmosphere-${id}`
}
