function pick<T>(seed: string, options: T[]): T {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return options[Math.abs(hash) % options.length]
}

function topicOr(topic: string, fallback: string) {
  const t = topic.replace(/\s+/g, " ").trim()
  return t || fallback
}

export function writeStory(topic: string, seed: string) {
  const subject = topicOr(topic, "a night bus that refused to end")
  return pick(seed, [
    `The first thing she noticed was not the ${subject}. It was the quiet that arrived just before it — that held-breath in a city that usually talks over itself.

A boy on the last step of a flyover counted the gaps between headlights. He had a notebook with one rule written on the inside cover: do not invent a destiny you are too tired to carry. Tonight the rule felt heavy, so he broke it on purpose. He invented a small one. Get home. Drink water. Tell the truth to whoever is still awake.

The ${subject} entered the story the way weather does. Not as a plot twist. As pressure. People shifted. A woman in a yellow dupatta laughed at a message and then did not send it. Somewhere a kettle clicked off and nobody came.

He got off two stops early because the invention had worked: he wanted the walk. On the walk he passed a shuttered bakery that still smelled like yesterday's sugar. He thought, this is how a life actually turns — not with a speech, with a street you decide not to skip.

When he reached the building, the landing light was already on. Someone had expected him, or the wiring was loyal. He stood there long enough to be a person and not a problem.

That is the whole story. ${subject} in it, yes. Also a boy who chose the long way home and did not need it to mean more than that.`,

    `Call it a fable if you want. I won't.

There was a woman who kept ${subject} in a steel dabba on the highest kitchen shelf, as if height could make a feeling behave. Every evening she climbed the stool, opened the lid, looked, closed it, climbed down. Her brother said that was not how you store anything, even grief, even ambition.

On a Thursday the stool wobbled. The dabba did not fall. She did. Only a little. Elbow, pride, the exact amount of hurt that makes you laugh in the wrong room.

She sat on the floor and ate a biscuit she had been saving for a better mood. The better mood did not arrive. The biscuit was still a biscuit. That helped more than the shelf ever had.

She left the dabba where it was. Not as surrender. As a truce. ${subject} could wait up there. She had a floor, a Thursday, and a brother who would make tea without asking what the metaphor was.

If you came for a moral: put the thing where your hands can reach it, or admit you are not ready and stop performing the climb.`,
  ])
}

export function writeJoke(topic: string, seed: string) {
  const subject = topicOr(topic, "adulting")
  return pick(seed, [
    `I asked ${subject} for a timeline. It sent a calendar invite titled "TBD" that repeats forever. That's not a joke, that's project management. The joke is we still RSVP yes.`,
    `People say ${subject} builds character. Character, in this economy, is just the loading screen you get instead of a refund.`,
    `I tried to explain ${subject} to a coconut. The coconut did better: it has water, a hard boundary, and it doesn't check email.`,
    `My plan for ${subject} was simple. Step one: start. Step two: become a person who has started. I am currently in a secret third step called opening a new tab.`,
  ])
}

export function writePun(topic: string, seed: string) {
  const subject = topicOr(topic, "waiting")
  return pick(seed, [
    `I'll give you ${subject} the way a kettle does: with a whistle, and only when it's actually done.`,
    `${subject}? I can carry that — I'm already in the business of holding things that are hot and pretending that's poise.`,
    `You wanted a pun on ${subject}. I considered several. Then I let the weaker ones stew. That's the whole method: don't serve undercooked wordplay.`,
  ])
}

export function writeSatire(topic: string, seed: string) {
  const subject = topicOr(topic, "the group chat")
  return pick(seed, [
    `Breaking: a committee has been formed to look into ${subject}. The committee's first act was to rename itself a taskforce. The second was to order snacks. The third was a slide titled "Next Steps" containing no steps and one clipart of a mountain.

Experts (a WhatsApp admin, two people who "just popped in") agree that ${subject} will be solved by alignment. Alignment, in this usage, means everyone staring at the same unread document until the problem develops manners.

A spokesperson said they are cautiously optimistic, which is the official translation of "we have seen the problem, and we have chosen fonts."

More as this develops, which it won't, unless someone puts a date on a calendar and fears the date more than the work.`,

    `In today's efficiency miracle, ${subject} has been disrupted. The disruption consists of the same work, a new logo, and a sentence that begins with "at scale."

Users are thrilled. Users, here, means three founders and a dog in the office that has learned to sit when someone says roadmap.

Critics argue that ${subject} did not ask to be a platform. The critics have been invited to an offsite where their concerns will be heard, noted, and laminated.`,
  ])
}

export function creativeReply(
  kind: "story" | "joke" | "pun" | "satire",
  topic: string,
  seed: string
) {
  if (kind === "joke") return writeJoke(topic, seed)
  if (kind === "pun") return writePun(topic, seed)
  if (kind === "satire") return writeSatire(topic, seed)
  return writeStory(topic, seed)
}
