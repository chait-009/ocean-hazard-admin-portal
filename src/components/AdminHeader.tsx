"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Earth,
  Languages,
  ChevronDown,
  ChevronRight,
  CircleUser,
  UserCog,
  IdCard,
  WifiHigh,
  EllipsisVertical,
  LayoutPanelTop,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type ServerStatus = "operational" | "degraded" | "down"

interface BreadcrumbEntry {
  label: string
  href?: string
}

interface UserInfo {
  name: string
  email?: string
  role?: string
  avatarUrl?: string
}

interface AdminHeaderProps {
  className?: string
  style?: React.CSSProperties
  breadcrumbs?: BreadcrumbEntry[]
  user?: UserInfo
  serverStatus?: ServerStatus
  appVersion?: string
  languages?: { code: string; label: string }[]
  currentLanguage?: string
  onLanguageChange?: (code: string) => void
  onProfile?: () => void
  onSettings?: () => void
  onLogout?: () => void
}

const statusStyles: Record<ServerStatus, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  operational: {
    label: "Operational",
    dot: "bg-green-500",
    text: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-green-500/20",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-500",
    text: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-amber-500/20",
  },
  down: {
    label: "Down",
    dot: "bg-red-500",
    text: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-red-500/20",
  },
}

export default function AdminHeader({
  className,
  style,
  breadcrumbs = [],
  user = { name: "Admin User", email: "admin@example.com", role: "Administrator" },
  serverStatus = "operational",
  appVersion = "v1.0.0",
  languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
    { code: "bn", label: "বাংলা" },
    { code: "ta", label: "தமிழ்" },
    { code: "mr", label: "मराठी" },
    { code: "te", label: "తెలుగు" },
  ],
  currentLanguage = "en",
  onLanguageChange,
  onProfile,
  onSettings,
  onLogout,
}: AdminHeaderProps) {
  const [online, setOnline] = React.useState<boolean>(true)
  const langMap = React.useMemo(() => {
    const m = new Map<string, string>()
    languages.forEach((l) => m.set(l.code, l.label))
    return m
  }, [languages])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => setOnline(window.navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  const currentLangLabel = langMap.get(currentLanguage) ?? "Language"

  const handleLanguageChange = (value: string) => {
    onLanguageChange?.(value)
    toast.success(`Language changed to ${langMap.get(value) ?? value}`)
  }

  const handleLogout = () => {
    onLogout?.()
    toast.message("Signed out", { description: "You have been logged out." })
  }

  const initials = (user?.name || "")
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const status = statusStyles[serverStatus]

  return (
    <header
      className={`w-full bg-card border-b border-border/80 ${className ?? ""}`}
      style={style}
      aria-label="Admin header"
    >
      <div className="mx-auto w-full max-w-full px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-3">
          <div className="min-w-0 flex-1">
            {breadcrumbs.length > 0 ? (
              <Breadcrumb>
                <BreadcrumbList className="text-sm">
                  {breadcrumbs.map((bc, idx) => {
                    const isLast = idx === breadcrumbs.length - 1
                    return (
                      <React.Fragment key={`${bc.label}-${idx}`}>
                        <BreadcrumbItem className="min-w-0">
                          {isLast ? (
                            <BreadcrumbPage className="truncate text-foreground">{bc.label}</BreadcrumbPage>
                          ) : bc.href ? (
                            <BreadcrumbLink href={bc.href} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                              {bc.label}
                            </BreadcrumbLink>
                          ) : (
                            <span className="text-muted-foreground truncate">{bc.label}</span>
                          )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator className="mx-1.5"><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></BreadcrumbSeparator>}
                      </React.Fragment>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <div className="h-5" aria-hidden />
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`hidden sm:flex items-center gap-2 rounded-full ${status.bg} px-2.5 py-1 border border-border/70 ring-1 ${status.ring}`}
              aria-live="polite"
              aria-label={`System status: ${status.label}`}
              title={`System status: ${status.label}`}
            >
              <span className={`inline-flex h-2 w-2 rounded-full ${status.dot}`} />
              <span className={`text-xs font-medium ${status.text} select-none`}>{status.label}</span>
              <span className="mx-1 h-3 w-px bg-border/70" aria-hidden />
              <LayoutPanelTop className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground select-none">{appVersion}</span>
            </div>

            <div
              className={`hidden sm:flex items-center gap-2 rounded-full px-2.5 py-1 border ${online ? "border-border/70 bg-secondary" : "border-destructive/40 bg-secondary"}`}
              aria-live="polite"
              aria-label={`Network: ${online ? "Online" : "Offline"}`}
              title={`Network: ${online ? "Online" : "Offline"}`}
            >
              <WifiHigh className={`h-4 w-4 ${online ? "text-foreground" : "text-destructive"}`} aria-hidden="true" />
              <span className={`text-xs font-medium ${online ? "text-foreground" : "text-destructive-foreground"} select-none`}>
                {online ? "Online" : "Offline"}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 rounded-md border-border/80 bg-card hover:bg-secondary text-foreground"
                  aria-label="Change language"
                >
                  <Earth className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">{currentLangLabel}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={languages.some((l) => l.code === currentLanguage) ? currentLanguage : undefined}
                  onValueChange={handleLanguageChange}
                >
                  {languages.map((l) => (
                    <DropdownMenuRadioItem key={l.code} value={l.code} className="cursor-pointer">
                      <Languages className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{l.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 px-2 sm:px-3 rounded-md hover:bg-secondary data-[state=open]:bg-secondary"
                  aria-label="User menu"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.avatarUrl} alt={user?.name ?? "User"} />
                      <AvatarFallback className="bg-accent text-accent-foreground">{initials || <CircleUser className="h-4 w-4" />}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate max-w-[10rem]">{user?.name}</span>
                      {user?.role ? (
                        <span className="text-xs text-muted-foreground truncate max-w-[10rem]">{user.role}</span>
                      ) : null}
                    </div>
                    <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline-block" aria-hidden="true" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-popover">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name ?? "User"} />
                    <AvatarFallback className="bg-accent text-accent-foreground">{initials || <CircleUser className="h-4 w-4" />}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name}</p>
                    {user?.email && <p className="text-xs text-muted-foreground truncate break-words">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    onProfile?.()
                  }}
                >
                  <IdCard className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    onSettings?.()
                  }}
                >
                  <UserCog className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>Account settings</span>
                </DropdownMenuItem>
                {user?.role ? (
                  <DropdownMenuItem className="cursor-default focus:bg-transparent focus:text-foreground">
                    <EllipsisVertical className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="text-muted-foreground">Role</span>
                      <span className="ml-2 max-w-[10rem] truncate font-medium">{user.role}</span>
                    </div>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <ChevronRight className="mr-2 h-4 w-4 rotate-180 text-destructive" aria-hidden="true" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}