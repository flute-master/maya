export type Tune = {
  id: string
  names: string[]
  scale: string
  kind: "teaching" | "folk" | "raga"
  sargam: string
  western: string
  how: string
}

/** Teaching and folk outlines only. Not full copyrighted film scores. */
export const TUNES: Tune[] = [
  {
    id: "saregama",
    names: ["saregama", "sa re ga ma", "alankar", "sargam"],
    scale: "Bilawal / major (any Sa)",
    kind: "teaching",
    sargam: "Sa Re Ga ma Pa Dha Ni SA | SA Ni Dha Pa ma Ga Re Sa",
    western: "If Sa = G: G A B C D E F# G'",
    how: "This is the spine. Even tone, even time. Then: SaSa ReRe GaGa mama, then SaReGa ReGama GaMaPa.",
  },
  {
    id: "hot-cross-buns",
    names: ["hot cross buns", "hot cross bun"],
    scale: "Sa-centered, three notes",
    kind: "teaching",
    sargam: "Ga Re Sa — Ga Re Sa — Sa Sa Sa Sa — Re Re Re Re — Ga Re Sa",
    western: "If Sa = G: B A G — B A G — G G G G — A A A A — B A G",
    how: "First real tune. Tongue each note. Then slur Ga-Re-Sa.",
  },
  {
    id: "twinkle",
    names: ["twinkle twinkle", "twinkle", "star song", "alphabet song"],
    scale: "Major / Bilawal",
    kind: "teaching",
    sargam: "Sa Sa Pa Pa | Dha Dha Pa — ma ma Ga Ga | Re Re Sa",
    western: "If Sa = C: C C G G | A A G — F F E E | D D C",
    how: "Public-domain teaching tune. Second phrase is the same shape a fifth lower. Bansuri: Pa is all holes closed.",
  },
  {
    id: "mary",
    names: ["mary had a little lamb", "mary lamb"],
    scale: "Major",
    kind: "teaching",
    sargam: "Ga Re Sa Re | Ga Ga Ga — Re Re Re — Ga Pa Pa",
    western: "If Sa = C: E D C D | E E E — D D D — E G G",
    how: "Same three-note family as Hot Cross Buns plus Pa.",
  },
  {
    id: "ode-to-joy",
    names: ["ode to joy", "beethoven joy", "ode to joy flute"],
    scale: "D major if Sa=D, or any major",
    kind: "teaching",
    sargam: "Ga Ga ma Pa | Pa ma Ga Re | Sa Sa Re Ga | Ga Re Re —",
    western: "E E F G | G F E D | C C D E | E D D —",
    how: "Public-domain melody. Keep the last pair of notes shorter. Good for even fingers.",
  },
  {
    id: "happy-birthday",
    names: ["happy birthday", "birthday song"],
    scale: "Major",
    kind: "folk",
    sargam: "Sa Sa Re Sa | ma Ga — Sa Sa Re Sa | Pa ma —",
    western: "C C D C | F E — C C D C | G F —",
    how: "Public domain. The pickup is two short Sas. Do not rush the ma.",
  },
  {
    id: "yaman",
    names: ["yaman", "raga yaman", "kalyan"],
    scale: "Yaman (tivra Ma)",
    kind: "raga",
    sargam: "Aroha: Ni Re Ga Ma(tivra) Dha Ni SA    Avaroha: SA Ni Dha Pa Ma Ga Re Sa",
    western: "If Sa = G: F# A B C# E F# G'   down: G' F# E D C# B A G",
    how: "Do not treat this as a film tune. Hold Ni before Re. Skip Pa on the way up. I can give a slow pakad: Ni Re Ga, Re Ga Ma, Ga Ma Dha Pa.",
  },
  {
    id: "bhairav",
    names: ["bhairav", "raga bhairav"],
    scale: "Bhairav (komal Re, komal Dha)",
    kind: "raga",
    sargam: "Aroha: Sa re Ga ma Pa dha Ni SA    Avaroha: SA Ni dha Pa ma Ga re Sa",
    western: "If Sa = C: C Db E F G Ab B C",
    how: "Morning raga. Re and Dha are flat. Slow, weight on dha-Ni-Sa and ma-Pa-dha.",
  },
  {
    id: "bhupali",
    names: ["bhupali", "bhoop", "bhup", "mohanam"],
    scale: "Pentatonic: S R G P D",
    kind: "raga",
    sargam: "Sa Re Ga Pa Dha SA | SA Dha Pa Ga Re Sa",
    western: "If Sa = G: G A B D E G'",
    how: "No ma, no Ni. First raga for many bansuri students after Bilawal. Rest on Pa and Sa.",
  },
  {
    id: "raghupati",
    names: ["raghupati raghav", "raghupati", "ram dhun"],
    scale: "Usually Mishra or a simple major-ish teaching version",
    kind: "folk",
    sargam: "Pa Pa ma Pa | Dha Pa ma Ga | Re Ga ma Pa | Ga Re Sa —",
    western: "Teaching contour only, not a studio arrangement.",
    how: "Common prayer-school version. Keep it slow. If your teacher sings a different vadi, follow them.",
  },
]

export function findTune(query: string): Tune | null {
  const q = query.toLowerCase().replace(/['’]/g, "").trim()
  if (!q) return null
  return (
    TUNES.find((tune) => tune.names.some((name) => q.includes(name))) ||
    TUNES.find((tune) => tune.id.replace(/-/g, " ") === q) ||
    null
  )
}

export function formatTune(tune: Tune) {
  return {
    summary: `${tune.names[0]} — ${tune.scale}`,
    detail: [
      tune.names[0],
      `Scale: ${tune.scale}`,
      `Sargam: ${tune.sargam}`,
      `Western (reference): ${tune.western}`,
      tune.how,
      "Bansuri student chart (G or any Sa): Sa ●●●○○○  Re ●●○○○○  Ga ●○○○○○  ma ○○○○○○  Pa ●●●●●●  Dha ●●●●●○  Ni ●●●●○○",
    ].join("\n"),
  }
}

export function unknownSong(name: string) {
  return {
    summary: `No full score in the teaching book for “${name}”.`,
    detail: [
      `I do not print a copyrighted film or pop arrangement note-for-note.`,
      `What I can do: name the likely raga/scale if it is well known, give a practice Sa–Pa skeleton, and read a clip of YOU playing it.`,
      `Drop a short recording with the paperclip (wav/mp3/m4a, under 8 MB) and say “notes for this clip”.`,
      `Or name a teaching tune I do keep: Twinkle, Hot Cross Buns, Mary, Ode to Joy, Happy Birthday, Sa Re Ga Ma, Bhupali, Yaman, Bhairav, Raghupati.`,
      `If you know the first line in sargam, send that — I will turn it into fingerings.`,
    ].join("\n"),
  }
}

export function extractSongQuery(text: string) {
  const cut = text.replace(
    /\b(flute|bansuri|notes?|sargam|swar|notation|how to play|teach me|on (the )?(flute|bansuri))\b/gi,
    " "
  )
  return cut.replace(/^(for|of|the)\s+/i, "").replace(/\s+/g, " ").trim()
}
