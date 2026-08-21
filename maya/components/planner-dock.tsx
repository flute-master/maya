"use client"

import { Bell, Check, ListTodo, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatWhen, googleCalendarUrl } from "@/lib/reminders"
import type { Reminder, TaskItem } from "@/lib/types"

export function PlannerDock({
  reminders,
  tasks,
  onDismissReminder,
  onToggleTask,
}: {
  reminders: Reminder[]
  tasks: TaskItem[]
  onDismissReminder: (id: string) => void
  onToggleTask: (id: string) => void
}) {
  const openReminders = reminders.filter((item) => !item.done).slice(0, 4)
  const openTasks = tasks.filter((item) => !item.done).slice(0, 4)
  if (!openReminders.length && !openTasks.length) return null

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
              className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
              href={googleCalendarUrl(item.text, item.at)}
              target="_blank"
              rel="noreferrer"
            >
              Calendar
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
