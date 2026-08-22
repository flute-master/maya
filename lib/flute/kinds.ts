export type FluteKind = {
  id: string
  name: string
  family: string
  region: string
  how: string
  firstNotes: string
}

export const FLUTE_KINDS: FluteKind[] = [
  {
    id: "bansuri",
    name: "Bansuri",
    family: "Side-blown bamboo",
    region: "North India, Hindustani",
    how: "Six playing holes (sometimes a seventh). Scale is named by the Sa you get with the first three holes closed — E, F, G, A, C are common student sizes. G medium is the usual starter. No keys. You roll the blow hole, you do not cover it like a bottle.",
    firstNotes: "Student 6-hole (madhya saptak): Sa ●●●○○○  Re ●●○○○○  Ga ●○○○○○  ma ○○○○○○  Pa ●●●●●●  Dha ●●●●●○  Ni ●●●●○○  high Sa ●●●○○○ with a harder blow. Your maker's chart wins if it disagrees.",
  },
  {
    id: "venu",
    name: "Venu / pullanguzhal",
    family: "Side-blown bamboo",
    region: "South India, Carnatic",
    how: "Eight holes is common. Fingering and gamaka style differ from bansuri. Same breath-and-hole idea. Ask if you play Carnatic — I will not force Hindustani names on a venu.",
    firstNotes: "Learn the maker's chart. Carnatic Sa is the tonic you chose, not a fixed Western pitch.",
  },
  {
    id: "concert",
    name: "Concert C flute (Boehm)",
    family: "Transverse metal, keyed",
    region: "Western orchestra / band",
    how: "Silver or nickel body, keys, C foot or B foot. You blow across the embouchure plate. First-octave B, A, G, F, E, D, C are the beginner set.",
    firstNotes: "Left hand closer to the headjoint. First sound: only the headjoint, then add the body. Low D and C need relaxed air, not force.",
  },
  {
    id: "piccolo",
    name: "Piccolo",
    family: "Transverse, keyed",
    region: "Western",
    how: "Sounds an octave above written. Same fingerings as concert flute, thinner air stream, cruel to the ears in a small room. Not a first flute.",
    firstNotes: "Treat written notes like flute fingerings. They sound 8va.",
  },
  {
    id: "alto",
    name: "Alto flute",
    family: "Transverse, keyed",
    region: "Western",
    how: "In G, longer tube, warmer. Fingerings like C flute; it sounds a fourth lower than written.",
    firstNotes: "Same fingers as C flute. Written C sounds G below.",
  },
  {
    id: "irish",
    name: "Irish flute",
    family: "Simple-system wooden",
    region: "Ireland / folk",
    how: "Usually in D, six open holes, sometimes keys. Not a bansuri and not a Boehm flute. Ornaments (cuts, taps, rolls) are the point.",
    firstNotes: "D scale with three-plus-three fingers. Learn tunes, not long tones only.",
  },
  {
    id: "recorder",
    name: "Recorder",
    family: "Fipple / end-blown",
    region: "Europe, schools",
    how: "You blow into a duct. Easier first sound than a side flute. Soprano in C is the school one. It is a cousin, not a cheat-code for bansuri embouchure.",
    firstNotes: "Left hand on top. All holes closed is low C (soprano). Thumb hole is the back one.",
  },
  {
    id: "shakuhachi",
    name: "Shakuhachi",
    family: "End-blown bamboo",
    region: "Japan",
    how: "Five holes, blown on a sharp edge. Meri/kari pitch bending. Different posture and philosophy. Do not force bansuri fingerings onto it.",
    firstNotes: "Ro (all closed) is the home tone. Honkyoku first, not film songs.",
  },
  {
    id: "dizi",
    name: "Dizi",
    family: "Transverse bamboo with membrane",
    region: "China",
    how: "Has a dimo membrane hole that buzzes. Six finger holes plus membrane. Bright. In D or C for beginners.",
    firstNotes: "Paste the dimo correctly or it sounds dead. Fingerings are not bansuri.",
  },
  {
    id: "quena",
    name: "Quena",
    family: "End-blown notch",
    region: "Andes",
    how: "Notch on the rim, six finger holes plus thumb. Usually in G. You aim the airstream at the notch, not across a side hole.",
    firstNotes: "G major is the home scale on a G quena.",
  },
  {
    id: "naf",
    name: "Native American-style flute",
    family: "Two-chamber fipple",
    region: "North America (contemporary / revival)",
    how: "Has a block (totem) and a slow air chamber. Pentatonic, very forgiving. Five or six holes. Not a bansuri.",
    firstNotes: "All closed is the root. Pentatonic — you almost cannot play a wrong note.",
  },
  {
    id: "pan",
    name: "Pan flute / siku",
    family: "Closed tubes",
    region: "Andes / Romania (nai)",
    how: "One note per tube. You move your head, not your fingers. Different skill entirely.",
    firstNotes: "Lowest tube is the tonic. Practice even air across the row.",
  },
]

export function describeKinds(query?: string) {
  const q = (query || "").toLowerCase()
  const hit = FLUTE_KINDS.find(
    (item) =>
      q &&
      (item.id === q ||
        item.name.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q))
  )
  if (hit) {
    return {
      summary: `${hit.name} — ${hit.family}.`,
      detail: [`${hit.name} (${hit.region})`, hit.how, hit.firstNotes].join("\n\n"),
    }
  }
  const lines = [
    "Main families you will actually meet:",
    ...FLUTE_KINDS.map(
      (item) => `• ${item.name} — ${item.family}. ${item.region}.`
    ),
    "",
    "If you are in India and said “flute” without a brand, you likely have a bansuri. If it has metal keys and a lip plate, it is a concert flute. Tell me which, and the scale written on the bamboo (E, G, A…).",
  ]
  return { summary: "Flute kinds — bansuri, concert, and the cousins.", detail: lines.join("\n") }
}
