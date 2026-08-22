export const LESSONS = [
  {
    id: "0",
    title: "Which flute, which Sa",
    body: `Sit with the instrument. Tell me:
• Bamboo side-hole = bansuri. Metal keys + lip plate = concert flute.
• Any letter on the bamboo (E, F, G, A, C) is the Western pitch of Sa (three holes closed on a student bansuri).
• If nothing is written, we treat it as a G bansuri until you say otherwise.

Today you do not learn a raga. You learn to make one clean sound.`,
  },
  {
    id: "1",
    title: "Hold and breathe",
    body: `Bansuri: sit tall or stand. Left hand closer to the blow hole (most players). Thumbs under the tube. Do not death-grip. The flute rests, it is not a cricket bat.

Concert flute: left hand nearer the headjoint, right thumb under the body, chin on the lip plate, hole not covered.

Breath: inhale low, as if the air fills the belt, not the shoulders. Exhale on an “oo” through a small aperture. One long hiss for 8 counts. That is riyaz even without the flute.`,
  },
  {
    id: "2",
    title: "First sound — no fingers",
    body: `Cover no holes. Aim the air at the far edge of the blow hole, not into it. Roll the flute a millimetre toward you or away until it speaks.

If you only get air: aperture too wide. If you get a dead thud: you are covering the hole. If you get a scream: less air, smaller lips.

Do this for 5 minutes. A thin clean tone beats a loud ugly one.`,
  },
  {
    id: "3",
    title: "Sa — the home note",
    body: `Bansuri (student 6-hole): close the three holes nearest the blow hole. ●●●○○○  Blow as in lesson 2. That is madhya Sa.

Concert flute: play B (left thumb + first finger) then A, then G. Or start on G if that is easier. I will still call the tonic “Sa” if you want Indian names on a Western flute — say so.

Hold Sa for 4 slow beats, rest, ten times. If it cracks, less air.`,
  },
  {
    id: "4",
    title: "Sa Re Ga ma",
    body: `Bansuri:
Sa ●●●○○○
Re ●●○○○○
Ga ●○○○○○
ma ○○○○○○

Go up, come down. Slow. Tongue a light “tu” on each note or slur them — both, separately.

Concert flute first tetrachord (written, C flute): G A B C or C D E F. Same idea: up and down, even tone.`,
  },
  {
    id: "5",
    title: "Pa and a first tune",
    body: `Bansuri Pa is all six closed ●●●●●● — more air than Sa, not more panic.

Then play Hot Cross Buns (Ga Re Sa, Ga Re Sa, Sa Sa Sa Sa, Re Re Re Re, Ga Re Sa) or the first line of Twinkle (Sa Sa Pa Pa, Dha Dha Pa).

If that is clean, you have a flute practice, not a wish.`,
  },
  {
    id: "6",
    title: "Daily riyaz — 15 minutes",
    body: `1. 2 min long tones on Sa.
2. 5 min Sa-Re-Ga-ma up and down, then add Pa.
3. 5 min one song you already have the notes for.
4. 3 min listen: record yourself on the phone, play it back once. Do not judge the person. Fix one thing tomorrow.

Six days a week. One day off. I can give you the next lesson, a fingering, or notes for a song you name. Drop a clip of your playing and I will read the pitches as best as a laptop can.`,
  },
]

export function lessonFor(query: string) {
  const q = query.toLowerCase()
  const numbered = q.match(/\blesson\s*(\d)/)
  if (numbered) {
    const item = LESSONS.find((row) => row.id === numbered[1])
    if (item) return item
  }
  if (/\b(hold|posture|sit|hands)\b/.test(q)) return LESSONS[1]
  if (/\b(breath|embouchure|sound|tone|blow)\b/.test(q)) return LESSONS[2]
  if (/\b(first note|sa\b|tonic)\b/.test(q)) return LESSONS[3]
  if (/\b(riyaz|practice|routine|daily)\b/.test(q)) return LESSONS[6]
  if (/\b(alankar|saregama|sa re ga)\b/.test(q)) return LESSONS[4]
  if (/\b(next|then|after that)\b/.test(q)) return LESSONS[3]
  return LESSONS[0]
}

export function formatLesson(
  lesson: (typeof LESSONS)[number],
  extra?: string
) {
  return {
    summary: `Flute lesson ${lesson.id}: ${lesson.title}`,
    detail: [`Lesson ${lesson.id} — ${lesson.title}`, lesson.body, extra || ""]
      .filter(Boolean)
      .join("\n\n"),
  }
}
