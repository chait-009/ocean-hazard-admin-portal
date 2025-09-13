"use client";

import React, { useMemo, useState } from "react";
import { UserCog, MonitorCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type Role = "admin" | "manager" | "viewer";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  status: "active" | "disabled";
};

type Keyword = {
  id: string;
  term: string;
  active: boolean;
  source: "twitter" | "facebook" | "instagram" | "rss";
  notes?: string;
};

export interface SystemSettingsProps {
  className?: string;
  style?: React.CSSProperties;
  currentRole?: Role;
  initialUsers?: User[];
  initialKeywords?: Keyword[];
}

const DEFAULT_USERS: User[] = [
  {
    id: "u_001",
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    role: "admin",
    permissions: ["users.read", "users.write", "system.configure", "data.export"],
    status: "active",
  },
  {
    id: "u_002",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    role: "manager",
    permissions: ["users.read", "keywords.manage", "data.export"],
    status: "active",
  },
  {
    id: "u_003",
    name: "Diego Fernandez",
    email: "diego.fernandez@example.com",
    role: "viewer",
    permissions: ["users.read"],
    status: "disabled",
  },
];

const DEFAULT_KEYWORDS: Keyword[] = [
  { id: "k_001", term: "road closure", active: true, source: "twitter" },
  { id: "k_002", term: "power outage", active: true, source: "facebook" },
  { id: "k_003", term: "flooding", active: true, source: "rss" },
  { id: "k_004", term: "evacuation", active: false, source: "instagram" },
];

const ALL_PERMISSIONS = [
  "users.read",
  "users.write",
  "keywords.manage",
  "data.export",
  "system.configure",
  "system.monitor",
];

export default function SystemSettings({
  className,
  style,
  currentRole = "admin",
  initialUsers = DEFAULT_USERS,
  initialKeywords = DEFAULT_KEYWORDS,
}: SystemSettingsProps) {
  const isAdmin = currentRole === "admin";

  // Users state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchUser, setSearchUser] = useState("");
  const filteredUsers = useMemo(() => {
    const q = searchUser.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, searchUser]);

  // Keywords state
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords);
  const [newTerm, setNewTerm] = useState("");
  const [newSource, setNewSource] = useState<Keyword["source"] | undefined>(undefined);
  const [keywordFilter, setKeywordFilter] = useState<"all" | Keyword["source"]>("all");
  const filteredKeywords = useMemo(() => {
    if (keywordFilter === "all") return keywords;
    return keywords.filter((k) => k.source === keywordFilter);
  }, [keywords, keywordFilter]);

  // Data export state
  const [exportScope, setExportScope] = useState<"all" | "last7" | "custom">("last7");
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "parquet">("csv");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  // System config state
  const [autoIngest, setAutoIngest] = useState(true);
  const [sendNotifications, setSendNotifications] = useState(true);
  const [retentionDays, setRetentionDays] = useState("30");
  const [logLevel, setLogLevel] = useState<"info" | "warn" | "error">("info");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Mocked health metrics
  const health = {
    api: { status: "operational", latencyMs: 142, uptimePct: 99.97 },
    db: { status: "operational", connections: 32, cpu: 41 },
    queue: { status: "degraded", lag: 128, consumers: 5 },
    ingestion: { status: "operational", ratePerMin: 420, failuresPct: 0.2 },
  } as const;

  // Handlers
  const handleRoleChange = (userId: string, role: Role) => {
    if (!isAdmin) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u)),
    );
    toast.success(`Updated role to ${role}`);
  };

  const handlePermissionToggle = (userId: string, perm: string) => {
    if (!isAdmin) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              permissions: u.permissions.includes(perm)
                ? u.permissions.filter((p) => p !== perm)
                : [...u.permissions, perm],
            }
          : u,
      ),
    );
  };

  const handleUserStatusToggle = (userId: string) => {
    if (!isAdmin) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "disabled" : "active" }
          : u,
      ),
    );
  };

  const handleAddKeyword = () => {
    if (!newTerm.trim() || !newSource) {
      toast.error("Enter a keyword and select a source");
      return;
    }
    const k: Keyword = {
      id: `k_${Date.now()}`,
      term: newTerm.trim(),
      active: true,
      source: newSource,
    };
    setKeywords((prev) => [k, ...prev]);
    setNewTerm("");
    setNewSource(undefined);
    toast.success("Keyword added");
  };

  const handleKeywordToggle = (id: string) => {
    setKeywords((prev) => prev.map((k) => (k.id === id ? { ...k, active: !k.active } : k)));
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    toast.success("Keyword removed");
  };

  const handleExport = async () => {
    if (exportScope === "custom" && (!exportFrom || !exportTo)) {
      toast.error("Select a valid date range for custom export");
      return;
    }
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setExporting(false);
    toast.success(`Export started (${exportFormat.toUpperCase()})`);
  };

  const handleSaveConfig = () => {
    toast.success("Configuration saved");
  };

  const handleSystemReset = () => {
    setConfirmResetOpen(false);
    toast.success("System reset initiated");
  };

  return (
    <section className={cn("w-full max-w-full bg-card text-foreground rounded-[var(--radius)] border border-[--border] shadow-sm", className)} style={style}>
      <div className="px-5 py-4 border-b border-[--border] flex items-center gap-3">
        <Settings className="h-5 w-5 text-[--primary]" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold leading-tight truncate">System Settings</h2>
          <p className="text-xs text-muted-foreground">Administrative controls and configuration</p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <Tabs defaultValue="users" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-secondary">
              <TabsTrigger value="users" className="min-w-0">Users</TabsTrigger>
              <TabsTrigger value="health" className="min-w-0">Health</TabsTrigger>
              <TabsTrigger value="keywords" className="min-w-0">Keywords</TabsTrigger>
              <TabsTrigger value="data" className="min-w-0">Data</TabsTrigger>
              <TabsTrigger value="config" className="min-w-0">Config</TabsTrigger>
            </TabsList>
            <Badge variant="outline" className="bg-accent text-accent-foreground border-accent/60">
              Role: {currentRole}
            </Badge>
          </div>

          <TabsContent value="users" className="mt-6">
            <Card className="bg-card border-[--border]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-[--primary]" aria-hidden />
                  <CardTitle>User Management</CardTitle>
                </div>
                <CardDescription>Manage roles and permissions. Only admins can modify access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="user-search" className="sr-only">Search users</Label>
                    <Input
                      id="user-search"
                      placeholder="Search by name, email, or role"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex flex-col gap-3 rounded-lg border border-[--border] p-3 sm:p-4 bg-background">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <Badge variant="secondary" className="shrink-0">{u.role}</Badge>
                            <Badge variant="outline" className={cn("shrink-0", u.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground")}>
                              {u.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`status-${u.id}`}
                              checked={u.status === "active"}
                              onCheckedChange={() => handleUserStatusToggle(u.id)}
                              disabled={!isAdmin}
                              aria-label={u.status === "active" ? "Disable user" : "Enable user"}
                            />
                            <Label htmlFor={`status-${u.id}`} className="text-sm text-muted-foreground cursor-default">Active</Label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`role-${u.id}`}>Role</Label>
                          <Select
                            value={u.role}
                            onValueChange={(val: Role) => handleRoleChange(u.id, val)}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger id={`role-${u.id}`} className="bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2 space-y-2 min-w-0">
                          <Label>Permissions</Label>
                          <div className="flex flex-wrap gap-2">
                            {ALL_PERMISSIONS.map((perm) => {
                              const active = u.permissions.includes(perm);
                              return (
                                <button
                                  key={perm}
                                  type="button"
                                  onClick={() => handlePermissionToggle(u.id, perm)}
                                  disabled={!isAdmin}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-full text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-[--ring]",
                                    active
                                      ? "bg-accent text-accent-foreground border-accent"
                                      : "bg-secondary text-muted-foreground border-[--border] hover:text-foreground",
                                    !isAdmin && "opacity-60 cursor-not-allowed",
                                  )}
                                  aria-pressed={active}
                                  aria-label={`${active ? "Revoke" : "Grant"} ${perm}`}
                                >
                                  {perm}
                                </button>
                              );
                            })}
                          </div>
                          {!isAdmin && (
                            <p className="text-xs text-muted-foreground">Only admins can change permissions.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No users match your search.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <Card className="bg-card border-[--border]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MonitorCheck className="h-5 w-5 text-[--primary]" aria-hidden />
                  <CardTitle>System Health</CardTitle>
                </div>
                <CardDescription>Realtime snapshot of service status and performance (mocked)</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HealthTile
                  title="API"
                  status={health.api.status}
                  meta={`${health.api.latencyMs} ms latency`}
                  progressLabel="Uptime"
                  progressValue={health.api.uptimePct}
                />
                <HealthTile
                  title="Database"
                  status={health.db.status}
                  meta={`${health.db.connections} conns · ${health.db.cpu}% CPU`}
                  progressLabel="CPU"
                  progressValue={health.db.cpu}
                />
                <HealthTile
                  title="Queue"
                  status={health.queue.status}
                  meta={`${health.queue.lag} msgs lag · ${health.queue.consumers} workers`}
                  progressLabel="Backlog"
                  progressValue={Math.min(100, (health.queue.lag / 500) * 100)}
                />
                <HealthTile
                  title="Ingestion"
                  status={health.ingestion.status}
                  meta={`${health.ingestion.ratePerMin}/min · ${health.ingestion.failuresPct}% fail`}
                  progressLabel="Throughput"
                  progressValue={Math.min(100, (health.ingestion.ratePerMin / 1000) * 100)}
                />
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Operational</Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Degraded</Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Down</Badge>
                <span className="text-xs text-muted-foreground ml-auto">Updated just now</span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="mt-6">
            <Card className="bg-card border-[--border]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[--primary]" aria-hidden />
                  <CardTitle>Keyword & Filter Management</CardTitle>
                </div>
                <CardDescription>Control social media ingestion by managing tracked terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 flex gap-2">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="new-term" className="sr-only">Keyword</Label>
                      <Input
                        id="new-term"
                        placeholder="Add keyword or phrase"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="w-40">
                      <Label htmlFor="new-source" className="sr-only">Source</Label>
                      <Select
                        value={newSource}
                        onValueChange={(val: Keyword["source"]) => setNewSource(val)}
                      >
                        <SelectTrigger id="new-source" className="bg-card">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="rss">RSS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" onClick={handleAddKeyword} className="shrink-0">
                      Add
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="filter-source" className="text-sm">Filter</Label>
                    <Select
                      value={keywordFilter}
                      onValueChange={(v: "all" | Keyword["source"]) => setKeywordFilter(v)}
                    >
                      <SelectTrigger id="filter-source" className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="rss">RSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredKeywords.map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[--border] bg-background">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{k.term}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{k.source}</Badge>
                          <Badge variant="outline" className={cn(k.active ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground")}>
                            {k.active ? "active" : "paused"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={k.active} onCheckedChange={() => handleKeywordToggle(k.id)} aria-label={k.active ? "Pause keyword" : "Activate keyword"} />
                        <ConfirmAction
                          title="Remove keyword?"
                          description={`This will stop tracking "${k.term}". You can add it again later.`}
                          onConfirm={() => handleRemoveKeyword(k.id)}
                          actionLabel="Remove"
                          variant="destructive"
                        >
                          <Button variant="outline">Remove</Button>
                        </ConfirmAction>
                      </div>
                    </div>
                  ))}
                  {filteredKeywords.length === 0 && (
                    <p className="text-sm text-muted-foreground">No keywords for this filter.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <Card className="bg-card border-[--border]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[--primary]" aria-hidden />
                  <CardTitle>Data Export</CardTitle>
                </div>
                <CardDescription>Export ingested data for post-event analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="export-scope">Range</Label>
                    <Select value={exportScope} onValueChange={(v: "all" | "last7" | "custom") => setExportScope(v)}>
                      <SelectTrigger id="export-scope" className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last7">Last 7 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-format">Format</Label>
                    <Select value={exportFormat} onValueChange={(v: "csv" | "json" | "parquet") => setExportFormat(v)}>
                      <SelectTrigger id="export-format" className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="parquet">Parquet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="invisible block">Export</Label>
                    <ConfirmAction
                      title="Start export?"
                      description="A background job will generate the export. You'll be notified when it's ready."
                      onConfirm={handleExport}
                      actionLabel={exporting ? "Starting..." : "Start export"}
                      disabled={exporting}
                    >
                      <Button className="w-full" disabled={exporting}>
                        {exporting ? "Starting..." : "Start export"}
                      </Button>
                    </ConfirmAction>
                  </div>
                </div>
                {exportScope === "custom" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="export-from">From</Label>
                      <Input
                        id="export-from"
                        type="date"
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="export-to">To</Label>
                      <Input
                        id="export-to"
                        type="date"
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                )}
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Tip: Narrow your range and use Parquet for large exports to speed up downloads.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <Card className="bg-card border-[--border]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[--primary]" aria-hidden />
                  <CardTitle>System Configuration</CardTitle>
                </div>
                <CardDescription>Core system behaviors and defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingRow
                    label="Auto-ingestion"
                    help="Automatically collect social media posts using active keywords."
                  >
                    <Switch checked={autoIngest} onCheckedChange={setAutoIngest} disabled={!isAdmin} aria-label="Toggle auto-ingestion" />
                  </SettingRow>
                  <SettingRow
                    label="Notifications"
                    help="Send email notifications for critical system events."
                  >
                    <Switch checked={sendNotifications} onCheckedChange={setSendNotifications} disabled={!isAdmin} aria-label="Toggle notifications" />
                  </SettingRow>
                  <SettingRow
                    label="Data retention (days)"
                    help="Older data will be purged automatically."
                  >
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-28 bg-background"
                      disabled={!isAdmin}
                      aria-label="Retention days"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Log level"
                    help="Controls verbosity of system logs."
                  >
                    <Select value={logLevel} onValueChange={(v: "info" | "warn" | "error") => setLogLevel(v)} disabled={!isAdmin}>
                      <SelectTrigger className="w-40 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warn</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">Only admins can change system configuration.</p>
                )}
              </CardContent>
              <CardFooter className="flex items-center gap-3 justify-between">
                <ConfirmAction
                  title="Reset system?"
                  description="This will restart services and clear in-memory caches. No persisted data will be deleted."
                  onConfirm={handleSystemReset}
                  actionLabel="Confirm reset"
                  variant="destructive"
                  open={confirmResetOpen}
                  onOpenChange={setConfirmResetOpen}
                  disabled={!isAdmin}
                >
                  <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5" disabled={!isAdmin}>
                    Reset system
                  </Button>
                </ConfirmAction>
                <Button onClick={handleSaveConfig} disabled={!isAdmin}>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function HealthTile({
  title,
  status,
  meta,
  progressLabel,
  progressValue,
}: {
  title: string;
  status: "operational" | "degraded" | "down" | string;
  meta: string;
  progressLabel: string;
  progressValue: number;
}) {
  const badgeClass =
    status === "operational"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "degraded"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <div className="rounded-lg border border-[--border] p-4 bg-background">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{title}</div>
        <Badge variant="outline" className={badgeClass}>
          {status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progressLabel}</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} aria-label={`${progressLabel} ${Math.round(progressValue)}%`} />
      </div>
    </div>
  );
}

function SettingRow({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[--border] bg-background">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {help && <p className="text-sm text-muted-foreground">{help}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ConfirmAction({
  children,
  title,
  description,
  onConfirm,
  actionLabel = "Confirm",
  variant = "default",
  open,
  onOpenChange,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  onConfirm: () => void;
  actionLabel?: string;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  disabled?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const controlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const isOpen = controlled ? open! : localOpen;

  const setOpen = (v: boolean) => {
    if (controlled) onOpenChange!(v);
    else setLocalOpen(v);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <span className={cn(disabled && "pointer-events-none opacity-60")} aria-disabled={disabled}>
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}