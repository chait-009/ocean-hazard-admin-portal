"use client"

import * as React from "react"
import type { CSSProperties } from "react"
import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  PanelLeft,
  PanelLeftOpen,
  PanelLeftClose,
  PanelsLeftBottom,
  SquareMenu,
  ChevronsDownUp,
  PanelLeftDashed,
  ChevronDown,
  ChevronLeft,
  ListCollapse,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Collapsible = {
  collapsed?: boolean
  onCollapsedChange?: (next: boolean) => void
}

export type AdminSidebarItem = {
  key: string
  label: string
  icon: LucideIcon
  group?: "main" | "secondary"
  badgeCount?: number
  disabled?: boolean
}

export type AdminSidebarProps = Collapsible & {
  className?: string
  style?: CSSProperties
  items?: AdminSidebarItem[]
  activeKey?: string
  onSelect?: (key: string) => void
  userName?: string
  roleLabel?: string
  onLogout?: () => void
  header?: React.ReactNode
}

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

const DEFAULT_ITEMS: AdminSidebarItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main" },
  { key: "map", label: "Map", icon: PanelsLeftBottom, group: "main" },
  { key: "reports", label: "Reports", icon: SquareMenu, group: "main" },
  { key: "social", label: "Social Media", icon: PanelLeftOpen, group: "main" },
  { key: "notifications", label: "Notifications", icon: ChevronsDownUp, group: "main", badgeCount: 3 },
  { key: "settings", label: "Settings", icon: PanelLeftDashed, group: "secondary" },
]

export default function AdminSidebar({
  className,
  style,
  items = DEFAULT_ITEMS,
  activeKey,
  onSelect,
  userName = "Admin",
  roleLabel = "Administrator",
  onLogout,
  collapsed: collapsedProp,
  onCollapsedChange,
  header,
}: AdminSidebarProps) {
  const [collapsedUncontrolled, setCollapsedUncontrolled] = React.useState(false)
  const collapsed = collapsedProp ?? collapsedUncontrolled

  const setCollapsed = (next: boolean) => {
    if (onCollapsedChange) onCollapsedChange(next)
    if (collapsedProp === undefined) setCollapsedUncontrolled(next)
  }

  const mainItems = items.filter((i) => (i.group ?? "main") === "main")
  const secondaryItems = items.filter((i) => i.group === "secondary")

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cx(
          "relative flex h-full min-h-0 w-full max-w-full flex-col border-r bg-card",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "md:w-16 w-16" : "md:w-64 w-64",
          className,
        )}
        style={style}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <div
            className={cx(
              "flex min-w-0 items-center gap-2",
              collapsed ? "justify-center w-full" : "justify-start",
            )}
          >
            <div className={cx("flex items-center rounded-md border bg-white p-2", collapsed ? "mx-auto" : "")}>
              <PanelsLeftBottom className="h-4 w-4 text-foreground" aria-hidden="true" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none text-foreground truncate">Admin Portal</p>
                <p className="text-xs text-muted-foreground leading-none mt-1">Control Center</p>
              </div>
            )}
          </div>
          <div className={cx("ml-auto", collapsed ? "absolute right-2" : "")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-foreground hover:bg-accent"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        <nav className="flex-1 min-h-0 overflow-y-auto py-2">
          <ul className="px-2 space-y-1">
            {mainItems.map((item) => (
              <li key={item.key}>
                <SidebarItem
                  item={item}
                  collapsed={collapsed}
                  active={activeKey === item.key}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>

          {secondaryItems.length > 0 && (
            <>
              <div className="px-3 py-3">
                {!collapsed ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <ListCollapse className="h-3.5 w-3.5" aria-hidden="true" />
                    Preferences
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center justify-center rounded-md px-2 py-1">
                          <ListCollapse className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">Preferences</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
              <ul className="px-2 space-y-1">
                {secondaryItems.map((item) => (
                  <li key={item.key}>
                    <SidebarItem
                      item={item}
                      collapsed={collapsed}
                      active={activeKey === item.key}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <Separator className="bg-border" />

        <div className="p-3">
          <div
            className={cx(
              "flex items-center gap-3 rounded-md border bg-white p-2",
              "shadow-sm",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded px-1.5 py-0 text-[10px] font-semibold"
                  >
                    {roleLabel}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Signed in</p>
              </div>
            )}
            <div className="ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    aria-label="Sign out"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Log out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarItem({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: AdminSidebarItem
  active?: boolean
  collapsed?: boolean
  onSelect?: (key: string) => void
}) {
  const Icon = item.icon
  const content = (
    <button
      type="button"
      onClick={() => !item.disabled && onSelect?.(item.key)}
      aria-current={active ? "page" : undefined}
      aria-disabled={item.disabled ? true : undefined}
      className={cx(
        "group relative flex w-full items-center gap-3 rounded-md px-2 py-2",
        "text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        item.disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-accent",
        active
          ? "bg-accent text-foreground"
          : "text-foreground",
      )}
    >
      <span
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white",
          active ? "border-[var(--ring)]" : "border-border",
        )}
        aria-hidden="true"
      >
        <Icon
          className={cx(
            "h-4 w-4 transition-colors",
            active ? "text-[var(--ring)]" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
      </span>

      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-left">
          {item.label}
        </span>
      )}

      {!collapsed && typeof item.badgeCount === "number" && item.badgeCount > 0 && (
        <Badge variant="secondary" className="ml-auto rounded px-1.5 py-0 text-[10px]">
          {item.badgeCount}
        </Badge>
      )}

      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded bg-[var(--ring)]"
        />
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}