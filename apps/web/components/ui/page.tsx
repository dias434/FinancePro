import * as React from "react"

import { cn } from "@/lib/utils"

export function Page({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-4 md:p-6", className)} {...props} />
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

