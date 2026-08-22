"use client"

import { Bell, Check, ListTodo, X } from "lucide-react"

import { GoogleCalendarMark } from "@/components/brand-marks"
import { Button } from "@/components/ui/button"
import { formatPlanLine } from "@/lib/mind"
import { formatWhen, googleCalendarUrl } from "@/lib/reminders"
import type { MindPlan, Reminder, TaskItem } from "@/lib/types"

export function PlannerDock({
  reminders,
  tasks,
  plans,
  onDismissReminder,
  onToggleTask,
}: {
  reminders: Reminder[]
  tasks: TaskItem[]
  plans?: MindPlan[]
  onDismissReminder: (id: string) => void
  onToggleTask: (id: string) => void
}) {
  const openReminders = reminders.filter((item) => !item.done).slice(0, 4)
  const openTasks = tasks.filter((item) => !item.done).slice(0, 4)
  const openPlans = (plans ?? [])
    .filter((plan) => plan.steps.some((step) => !step.done))
    .slice(0, 2)
  if (!openReminders.length && !openTasks.length && !openPlans.length) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-1.5 px-4 pb-1">
      {openReminders.map((item) => {
        const due = item.fired
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm shadow-sm ring-1 ring-foreground/5"
          >
            <Bell className="size-3.5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">
                {item.kind === "alarm" ? "Alarm" : "Reminder"}
                {due ? " now" : ` · ${formatWhen(item.at)}`}
              </span>
              <span className="text-foreground"> · {item.text}</span>
            </p>
            <a
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"
              href={googleCalendarUrl(item.text, item.at)}
              target="_blank"
              rel="noreferrer"
              title="Add to Google Calendar"
              aria-label="Add to Google Calendar"
            >
              <GoogleCalendarMark className="size-4" />
            </a>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Dismiss"
              onClick={() => onDismissReminder(item.id)}
            >
              <X />
            </Button>
          </div>
        )
      })}
      {openPlans.map((plan) => {
        const next = plan.steps.find((step) => !step.done)
        return (
          <div
            key={plan.id}
            className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm shadow-sm ring-1 ring-foreground/5"
          >
            <ListTodo className="size-3.5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">Plan · </span>
              {formatPlanLine(plan)}
              {next ? ` — next: ${next.text}` : ""}
            </p>
          </div>
        )
      })}
      {openTasks.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm shadow-sm ring-1 ring-foreground/5"
        >
          <ListTodo className="size-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate">{item.text}</p>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Mark done"
            onClick={() => onToggleTask(item.id)}
          >
            <Check />
          </Button>
        </div>
      ))}
    </div>
  )
}
