import { fetchWeather } from "@/lib/weather"
import type { SkillModule } from "@/lib/skills/types"
import type { WeatherArgs } from "@/skills/weather/types"

export const weatherSkill: SkillModule = {
  id: "weather",
  label: "Weather",
  description: "Live weather. Needs the net. Provider is replaceable.",
  offline: false,
  network: true,
  permission: "automatic",
  tools: ["weather"],
}

export async function runWeatherSkill(args: WeatherArgs) {
  return fetchWeather(args.place)
}
