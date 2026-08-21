import type { SearchHit } from "@/lib/types"

const UA =
  "MayaCompanion/0.1 (https://github.com/flute-master/maya; local personal companion)"

export async function fetchGithubProfile(login: string): Promise<{
  hit: SearchHit
  facts: string[]
} | null> {
  const user = login.trim()
  if (!/^[A-Za-z0-9-]{1,39}$/.test(user)) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const profileRes = await fetch(`https://api.github.com/users/${user}`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
    })
    if (!profileRes.ok) return null
    const profile = (await profileRes.json()) as {
      login?: string
      name?: string
      bio?: string
      html_url?: string
      location?: string
      public_repos?: number
      blog?: string
    }

    const reposRes = await fetch(
      `https://api.github.com/users/${user}/repos?sort=updated&per_page=12&type=owner`,
      {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
      }
    )
    const langs = new Map<string, number>()
    const repoNames: string[] = []
    if (reposRes.ok) {
      const repos = (await reposRes.json()) as Array<{
        name?: string
        language?: string | null
        fork?: boolean
      }>
      for (const repo of repos) {
        if (!repo.name || repo.fork) continue
        repoNames.push(repo.name)
        if (repo.language) {
          langs.set(repo.language, (langs.get(repo.language) || 0) + 1)
        }
      }
    }

    const languages = [...langs.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)
      .slice(0, 6)
    const who = profile.name || profile.login || user
    const snippet = [
      `Public GitHub for ${who} (@${profile.login || user}).`,
      profile.bio ? `Bio: ${profile.bio}` : "",
      profile.location ? `Location: ${profile.location}` : "",
      languages.length ? `Languages: ${languages.join(", ")}.` : "",
      repoNames.length
        ? `Recent public repos: ${repoNames.slice(0, 6).join(", ")}.`
        : "",
      typeof profile.public_repos === "number"
        ? `${profile.public_repos} public repos.`
        : "",
    ]
      .filter(Boolean)
      .join(" ")

    const facts = [
      `GitHub: ${profile.html_url || `https://github.com/${user}`}`,
      profile.bio ? `GitHub bio: ${profile.bio}` : "",
      languages.length ? `Skills from GitHub: ${languages.join(", ")}` : "",
      profile.location ? `GitHub location: ${profile.location}` : "",
      profile.name && profile.name !== user ? `GitHub name: ${profile.name}` : "",
    ].filter(Boolean)

    return {
      hit: {
        title: `GitHub · ${who}`,
        snippet,
        source: "GitHub",
        url: profile.html_url || `https://github.com/${user}`,
      },
      facts,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
