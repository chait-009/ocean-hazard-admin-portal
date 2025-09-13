"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellPlus,
  BellRing,
  CircleAlert,
  MessageSquareWarning,
  OctagonAlert,
  ShieldAlert,
  Signal,
  Siren,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

type RecipientGroup = "citizens" | "officials" | "first_responders" | "public_works" | "all";
type AlertSeverity = "emergency" | "warning" | "info";

type HistoryItem = {
  id: string;
  timestamp: string;
  region: string;
  recipients: RecipientGroup[];
  title: string;
  message: string;
  severity: AlertSeverity;
  delivered: number; // count delivered
  total: number; // total recipients
  read: number;
  status: "queued" | "sending" | "delivered" | "partial" | "failed";
};

type KeywordRule = {
  id: string;
  keyword: string;
  enabled: boolean;
  severity: AlertSeverity;
  description?: string;
};

export type NotificationCenterProps = {
  className?: string;
  style?: React.CSSProperties;
  initialRegion?: string;
  availableRegions?: { id: string; name: string }[];
  defaultRecipients?: RecipientGroup[];
  history?: HistoryItem[];
  keywordRules?: KeywordRule[];
  onSend?: (payload: {
    region: string | null;
    recipients: RecipientGroup[];
    title: string;
    message: string;
    severity: AlertSeverity;
  }) => Promise<{ ok: boolean; id?: string } | void>;
  onCreateKeywordRule?: (rule: Omit<KeywordRule, "id">) => Promise<{ ok: boolean; id?: string } | void>;
  onToggleKeywordRule?: (id: string, enabled: boolean) => Promise<void> | void;
};

const defaultRegions = [
  { id: "north", name: "Northern District" },
  { id: "east", name: "Eastern District" },
  { id: "central", name: "Central City" },
  { id: "south", name: "Southern Plains" },
  { id: "west", name: "Western Hills" },
];

const initialHistoryMock: HistoryItem[] = [
  {
    id: "hx-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    region: "Central City",
    recipients: ["citizens", "officials"],
    title: "Water Main Repair",
    message: "Crews are repairing a water main near 5th Ave. Expect reduced pressure until 3 PM.",
    severity: "info",
    delivered: 3280,
    total: 3325,
    read: 1240,
    status: "delivered",
  },
  {
    id: "hx-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    region: "Eastern District",
    recipients: ["first_responders", "public_works"],
    title: "High Wind Advisory",
    message: "Sustained winds 35-45 mph with stronger gusts. Secure loose items and avoid tall scaffolds.",
    severity: "warning",
    delivered: 685,
    total: 720,
    read: 402,
    status: "partial",
  },
  {
    id: "hx-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    region: "Northern District",
    recipients: ["all"],
    title: "Wildfire Evacuation",
    message: "Immediate evacuation for zones A and B. Use Route 12 southbound. Shelters at Lakeview HS.",
    severity: "emergency",
    delivered: 12450,
    total: 12610,
    read: 7810,
    status: "delivered",
  },
];

const initialKeywordRulesMock: KeywordRule[] = [
  { id: "kr-1", keyword: "wildfire", enabled: true, severity: "emergency", description: "Trigger immediate siren alerts for wildfire reports." },
  { id: "kr-2", keyword: "flood", enabled: true, severity: "warning", description: "Warn residents near floodplains." },
  { id: "kr-3", keyword: "water main", enabled: false, severity: "info", description: "Notify maintenance and nearby residents." },
];

function severityBadge(sev: AlertSeverity) {
  switch (sev) {
    case "emergency":
      return (
        <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm">
          Emergency
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          Warning
        </Badge>
      );
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function statusBadge(status: HistoryItem["status"]) {
  const base = "rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (status) {
    case "queued":
      return <span className={`${base} bg-muted text-muted-foreground`}>Queued</span>;
    case "sending":
      return <span className={`${base} bg-secondary text-foreground`}>Sending</span>;
    case "delivered":
      return <span className={`${base} bg-primary text-primary-foreground`}>Delivered</span>;
    case "partial":
      return <span className={`${base} bg-accent text-accent-foreground`}>Partial</span>;
    case "failed":
      return <span className={`${base} bg-destructive text-destructive-foreground`}>Failed</span>;
  }
}

export default function NotificationCenter(props: NotificationCenterProps) {
  const {
    className,
    style,
    availableRegions = defaultRegions,
    initialRegion,
    defaultRecipients = [],
    history: historyProp,
    keywordRules: keywordProp,
    onSend,
    onCreateKeywordRule,
    onToggleKeywordRule,
  } = props;

  const [activeTab, setActiveTab] = useState<"compose" | "history" | "automation">("compose");

  // Compose state
  const [region, setRegion] = useState<string | undefined>(initialRegion);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<RecipientGroup[]>(defaultRecipients);
  const [confirm, setConfirm] = useState<{ open: boolean; severity: AlertSeverity | null }>({
    open: false,
    severity: null,
  });
  const totalSelectedRecipients = recipients.length;

  // Data
  const [history, setHistory] = useState<HistoryItem[]>(
    historyProp && historyProp.length ? historyProp : initialHistoryMock
  );
  const [rules, setRules] = useState<KeywordRule[]>(
    keywordProp && keywordProp.length ? keywordProp : initialKeywordRulesMock
  );

  // Automation state
  const [newKeyword, setNewKeyword] = useState("");
  const [newSeverity, setNewSeverity] = useState<AlertSeverity | undefined>(undefined);
  const [creatingRule, setCreatingRule] = useState(false);

  const canSend = useMemo(() => {
    return Boolean(region && title.trim().length > 0 && message.trim().length > 0 && recipients.length > 0);
  }, [region, title, message, recipients]);

  function toggleRecipient(group: RecipientGroup) {
    setRecipients((prev) => {
      if (group === "all") {
        return ["all"];
      }
      if (prev.includes("all")) {
        return [group];
      }
      return prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group];
    });
  }

  function previewContent(text: string, len = 72) {
    if (!text) return "";
    if (text.length <= len) return text;
    return text.slice(0, len - 1) + "…";
  }

  function humanDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  async function handleSend(severity: AlertSeverity) {
    if (!canSend) return;
    setConfirm({ open: true, severity });
  }

  async function confirmSend() {
    const severity = confirm.severity!;
    setConfirm({ open: false, severity: null });

    const payload = {
      region: region ?? null,
      recipients,
      title: title.trim(),
      message: message.trim(),
      severity,
    };

    toast("Dispatch initiated", {
      description: "Your alert is being queued for delivery.",
    });

    if (onSend) {
      try {
        await onSend(payload);
      } catch (e) {
        toast.error("Failed to send alert");
        return;
      }
    }

    const id = `hx-${Math.random().toString(36).slice(2, 7)}`;
    const regionName =
      availableRegions.find((r) => r.id === region)?.name || "All Regions";
    const total = recipients.includes("all") ? 15000 : 3500 + Math.floor(Math.random() * 6000);

    const newItem: HistoryItem = {
      id,
      timestamp: new Date().toISOString(),
      region: regionName,
      recipients: [...recipients],
      title: payload.title,
      message: payload.message,
      severity,
      delivered: 0,
      total,
      read: 0,
      status: "queued",
    };

    setHistory((prev) => [newItem, ...prev]);

    // Simulate progress
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, status: "sending", delivered: Math.floor(total * 0.2) } : h
        )
      );
    }, 800);

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((h) =>
          h.id === id
            ? { ...h, status: "delivered", delivered: total, read: Math.floor(total * 0.52) }
            : h
        )
      );
      toast.success("Alert delivered", {
        description: `${payload.title} has been delivered to recipients.`,
      });
    }, 2100);

    // Reset compose form lightly for next action
    setTitle("");
    setMessage("");
  }

  async function addKeywordRule() {
    if (!newKeyword.trim() || !newSeverity) {
      toast.warning("Add keyword and choose severity");
      return;
    }
    setCreatingRule(true);
    const ruleDraft: Omit<KeywordRule, "id"> = {
      keyword: newKeyword.trim(),
      severity: newSeverity,
      enabled: true,
      description: undefined,
    };
    try {
      if (onCreateKeywordRule) {
        await onCreateKeywordRule(ruleDraft);
      }
      const id = `kr-${Math.random().toString(36).slice(2, 7)}`;
      setRules((prev) => [{ id, ...ruleDraft }, ...prev]);
      setNewKeyword("");
      setNewSeverity(undefined);
      toast.success("Keyword rule created");
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setCreatingRule(false);
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    try {
      if (onToggleKeywordRule) {
        await onToggleKeywordRule(id, enabled);
      }
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    } catch {
      toast.error("Unable to update rule");
    }
  }

  const selectedRegionName =
    availableRegions.find((r) => r.id === region)?.name || "Select a region";

  const recipientLabels: Record<RecipientGroup, string> = {
    all: "All recipients",
    citizens: "Citizens",
    officials: "Officials",
    first_responders: "First responders",
    public_works: "Public works",
  };

  return (
    <div className={`w-full max-w-full ${className ?? ""}`} style={style}>
      <Card className="w-full bg-card border border-border rounded-xl shadow-sm">
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
              <BellRing className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                Notification Center
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Create, send, and track alerts to regions and teams.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="bg-secondary">
              <TabsTrigger value="compose" className="min-w-[96px]">
                Compose
              </TabsTrigger>
              <TabsTrigger value="history" className="min-w-[96px]">
                History
              </TabsTrigger>
              <TabsTrigger value="automation" className="min-w-[120px]">
                Keyword alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="mt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="bg-card border border-border rounded-lg p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="region" className="text-sm font-medium">
                        Target region
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Choose region to notify
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px] gap-4">
                      <div className="min-w-0">
                        <div className="relative overflow-hidden rounded-md border border-border bg-muted">
                          <img
                            src="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=60"
                            alt="Mini map preview of selected region"
                            className="block w-full h-40 object-cover select-none"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-black/40 to-black/0">
                            <div className="inline-flex items-center gap-2 rounded-md bg-card/90 backdrop-blur px-2 py-1">
                              <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
                              <span className="text-xs font-medium text-foreground truncate">
                                {selectedRegionName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <Select
                          value={region}
                          onValueChange={setRegion}
                        >
                          <SelectTrigger id="region" className="w-full">
                            <SelectValue placeholder="Select region..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRegions.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Recipients</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["all", "citizens", "officials", "first_responders", "public_works"] as RecipientGroup[]).map(
                          (g) => (
                            <label
                              key={g}
                              className="flex items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2 cursor-pointer hover:bg-muted transition"
                            >
                              <Checkbox
                                checked={recipients.includes(g)}
                                onCheckedChange={() => toggleRecipient(g)}
                                aria-label={`Toggle ${recipientLabels[g]}`}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium leading-none">{recipientLabels[g]}</div>
                                <div className="text-xs text-muted-foreground">
                                  {g === "all"
                                    ? "Overrides other selections"
                                    : g === "citizens"
                                    ? "Registered residents"
                                    : g === "officials"
                                    ? "City and district officials"
                                    : g === "first_responders"
                                    ? "Fire, EMS, police"
                                    : "Utilities and maintenance crews"}
                                </div>
                              </div>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-card border border-border rounded-lg p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter alert title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message">Message</Label>
                        <span className="text-xs text-muted-foreground">
                          {message.trim().length}/480
                        </span>
                      </div>
                      <Textarea
                        id="message"
                        placeholder="Compose the alert message with clear actions and location references…"
                        value={message}
                        onChange={(e) => {
                          const text = e.target.value.slice(0, 480);
                          setMessage(text);
                        }}
                        rows={8}
                        className="bg-card resize-y"
                      />
                    </div>

                    <div className="rounded-md bg-secondary p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CircleAlert className="h-4 w-4" aria-hidden="true" />
                        <span>
                          Include specific instructions, timeframes, and official sources. Avoid abbreviations when possible.
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">
                        {totalSelectedRecipients > 0 ? (
                          <span>
                            Ready to send to{" "}
                            <strong className="text-foreground">{recipients.includes("all") ? "all recipients" : `${totalSelectedRecipients} group(s)`}</strong>
                            {region ? ` in ${selectedRegionName}` : " (no region selected)"}
                          </span>
                        ) : (
                          <span>Select at least one recipient group</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="gap-2"
                                onClick={() => toast("Saved draft", { description: "Draft stored locally." })}
                              >
                                <BellPlus className="h-4 w-4" aria-hidden="true" />
                                Save draft
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Save this alert to continue later
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          type="button"
                          disabled={!canSend}
                          onClick={() => handleSend("info")}
                          className="bg-secondary text-foreground hover:bg-muted"
                        >
                          <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send info
                        </Button>
                        <Button
                          type="button"
                          disabled={!canSend}
                          onClick={() => handleSend("warning")}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <TriangleAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send warning
                        </Button>
                        <Button
                          type="button"
                          disabled={!canSend}
                          onClick={() => handleSend("emergency")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Siren className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send emergency
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Delivery history</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search by title or region…"
                      className="h-9 w-[220px] sm:w-[280px]"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        setHistory((prev) => {
                          if (!q) {
                            return historyProp && historyProp.length ? historyProp : initialHistoryMock;
                          }
                          return (historyProp && historyProp.length ? historyProp : initialHistoryMock).filter(
                            (h) =>
                              h.title.toLowerCase().includes(q) ||
                              h.region.toLowerCase().includes(q)
                          );
                        });
                      }}
                    />
                  </div>
                </div>
                <Separator />
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableCaption className="text-xs text-muted-foreground">
                      Recent alerts with delivery status and read receipts.
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Timestamp</TableHead>
                        <TableHead className="min-w-[160px]">Region</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead className="min-w-[200px]">Title</TableHead>
                        <TableHead>Preview</TableHead>
                        <TableHead className="min-w-[160px]">Delivery</TableHead>
                        <TableHead className="min-w-[120px]">Severity</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => {
                        const progress = Math.min(100, Math.round((h.delivered / h.total) * 100));
                        const readRate =
                          h.total > 0 ? Math.round((h.read / h.total) * 100) : 0;

                        return (
                          <TableRow key={h.id} className="hover:bg-muted/50">
                            <TableCell className="whitespace-nowrap">{humanDate(h.timestamp)}</TableCell>
                            <TableCell className="whitespace-nowrap">{h.region}</TableCell>
                            <TableCell className="min-w-0">
                              <div className="flex flex-wrap gap-1">
                                {h.recipients.map((r) => (
                                  <Badge key={r} variant="outline" className="text-xs">
                                    {r === "all" ? "All" : recipientLabels[r]}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{h.title}</TableCell>
                            <TableCell className="max-w-[360px]">
                              <p className="text-sm text-muted-foreground break-words">
                                {previewContent(h.message)}
                              </p>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="min-w-[140px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span>{h.delivered.toLocaleString()}/{h.total.toLocaleString()}</span>
                                  <span className="text-muted-foreground">{progress}%</span>
                                </div>
                                <Progress value={progress} className="mt-1" />
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Read: {h.read.toLocaleString()} ({readRate}%)
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{severityBadge(h.severity)}</TableCell>
                            <TableCell>{statusBadge(h.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="mt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2 bg-card border border-border rounded-lg p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Keyword rules</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enable automated early warnings
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {rules.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border p-6 text-center">
                        <p className="text-sm text-muted-foreground">No rules yet. Create your first keyword alert.</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {rules.map((r) => (
                          <li
                            key={r.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-border bg-secondary p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-card">
                                {r.severity === "emergency" ? (
                                  <OctagonAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
                                ) : r.severity === "warning" ? (
                                  <TriangleAlert className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                                ) : (
                                  <Bell className="h-4 w-4 text-foreground" aria-hidden="true" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">"{r.keyword}"</span>
                                  {severityBadge(r.severity)}
                                </div>
                                {r.description ? (
                                  <p className="text-xs text-muted-foreground break-words">{r.description}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                              <Switch
                                checked={r.enabled}
                                onCheckedChange={(v) => toggleRule(r.id, Boolean(v))}
                                aria-label={`Toggle rule for ${r.keyword}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {r.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="bg-card border border-border rounded-lg p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <BellPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">New keyword</h3>
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="kw">Keyword or phrase</Label>
                      <Input
                        id="kw"
                        placeholder="e.g., wildfire, landslide, power outage"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="kw-severity">Severity</Label>
                      <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as AlertSeverity)}>
                        <SelectTrigger id="kw-severity">
                          <SelectValue placeholder="Select severity…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      onClick={addKeywordRule}
                      disabled={creatingRule}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <BellRing className="mr-2 h-4 w-4" aria-hidden="true" />
                      {creatingRule ? "Creating…" : "Create rule"}
                    </Button>
                    <div className="rounded-md bg-secondary p-3">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CircleAlert className="h-4 w-4 mt-0.5" aria-hidden="true" />
                        <p>
                          Rules trigger automatic alerts when new reports, social monitoring, or sensor data contain the keyword. You can refine criteria in Settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <Dialog open={confirm.open} onOpenChange={(o) => setConfirm((c) => ({ ...c, open: o }))}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirm.severity === "emergency" ? (
                <>
                  <Siren className="h-5 w-5 text-destructive" aria-hidden="true" />
                  Confirm emergency alert
                </>
              ) : confirm.severity === "warning" ? (
                <>
                  <TriangleAlert className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
                  Confirm warning alert
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
                  Confirm info alert
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Review details before sending. This action will notify selected recipients{region ? ` in ${selectedRegionName}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-medium">{title || "(No title)"}</div>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {message || "(No message)"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedRegionName}</Badge>
                {recipients.map((r) => (
                  <Badge key={r} variant="secondary">
                    {r === "all" ? "All" : recipientLabels[r]}
                  </Badge>
                ))}
                {confirm.severity ? severityBadge(confirm.severity) : null}
              </div>
            </div>
            <div className="rounded-md bg-secondary p-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mt-0.5" aria-hidden="true" />
                <p>
                  Ensure content is accurate and actionable. Alerts are logged for audit.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirm({ open: false, severity: null })}>
              Cancel
            </Button>
            {confirm.severity === "emergency" ? (
              <Button
                onClick={confirmSend}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Siren className="mr-2 h-4 w-4" aria-hidden="true" />
                Send emergency
              </Button>
            ) : confirm.severity === "warning" ? (
              <Button onClick={confirmSend} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <TriangleAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                Send warning
              </Button>
            ) : (
              <Button onClick={confirmSend} className="bg-secondary text-foreground hover:bg-muted">
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Send info
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}