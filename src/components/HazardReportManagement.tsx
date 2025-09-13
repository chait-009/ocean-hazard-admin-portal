"use client";

import React from "react";
import {
  ListFilter,
  ListFilterPlus,
  Columns3,
  FileCheck2,
  FunnelPlus,
  ShieldCheck,
  CircleDot,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type HazardStatus = "new" | "in_review" | "verified" | "dismissed";
type Verification = "unverified" | "pending" | "verified";

type HazardReport = {
  id: string;
  hazardType: string;
  location: string;
  date: string; // ISO
  status: HazardStatus;
  verification: Verification;
  source: "citizen" | "sensor" | "social";
  description: string;
  media: { type: "image" | "video"; url: string }[];
  audit: { id: string; actor: string; action: string; at: string }[];
};

const STATUS_META: Record<
  HazardStatus,
  { label: string; color: string; dot: string }
> = {
  new: { label: "New", color: "bg-accent text-accent-foreground", dot: "bg-chart-2" },
  in_review: {
    label: "In Review",
    color: "bg-muted text-muted-foreground",
    dot: "bg-chart-4",
  },
  verified: {
    label: "Verified",
    color: "bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  dismissed: {
    label: "Dismissed",
    color: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

const VERIFICATION_META: Record<
  Verification,
  { label: string; color: string }
> = {
  unverified: { label: "Unverified", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", color: "bg-accent text-accent-foreground" },
  verified: { label: "Verified", color: "bg-green-50 text-green-700" },
};

const HAZARD_TYPES = [
  "Flood",
  "Fire",
  "Landslide",
  "Earthquake",
  "Storm",
  "Pollution",
] as const;

const SOURCES = ["citizen", "sensor", "social"] as const;

type SortKey = "hazardType" | "location" | "date" | "status" | "source";

type Props = {
  className?: string;
  initialData?: HazardReport[];
  onExportCSV?: (csv: string) => void;
  onStatusChange?: (ids: string[], status: HazardStatus) => Promise<void> | void;
};

function generateSampleData(): HazardReport[] {
  // simple deterministic sample items
  return [
    {
      id: "HR-01021",
      hazardType: "Flood",
      location: "Riverside District",
      date: "2025-09-06T09:14:00Z",
      status: "new",
      verification: "unverified",
      source: "citizen",
      description:
        "Street flooded after heavy rainfall. Water level reaching sidewalk.",
      media: [
        {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1502126829571-83575bb514b0?q=80&w=1200&auto=format&fit=crop",
        },
      ],
      audit: [
        {
          id: "A1",
          actor: "system",
          action: "Report created via mobile app",
          at: "2025-09-06T09:14:30Z",
        },
      ],
    },
    {
      id: "HR-01022",
      hazardType: "Fire",
      location: "Industrial Park",
      date: "2025-09-05T17:42:00Z",
      status: "in_review",
      verification: "pending",
      source: "social",
      description: "Smoke visible from warehouse unit 7.",
      media: [
        {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=1200&auto=format&fit=crop",
        },
        {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1493515322954-4fa727e97985?q=80&w=1200&auto=format&fit=crop",
        },
      ],
      audit: [
        {
          id: "A2",
          actor: "Alex Rivera",
          action: "Marked as In Review",
          at: "2025-09-05T18:00:00Z",
        },
      ],
    },
    {
      id: "HR-01023",
      hazardType: "Landslide",
      location: "Hillside Road",
      date: "2025-09-03T06:25:00Z",
      status: "verified",
      verification: "verified",
      source: "sensor",
      description:
        "Movement detected on slope, small debris on road. Crew dispatched.",
      media: [
        {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1523742810067-5f32d14f6b26?q=80&w=1200&auto=format&fit=crop",
        },
      ],
      audit: [
        {
          id: "A3",
          actor: "Priya K",
          action: "Changed status to Verified",
          at: "2025-09-03T07:00:00Z",
        },
        {
          id: "A4",
          actor: "system",
          action: "Auto-notified response team",
          at: "2025-09-03T07:02:00Z",
        },
      ],
    },
    {
      id: "HR-01024",
      hazardType: "Pollution",
      location: "City Center",
      date: "2025-09-02T12:10:00Z",
      status: "dismissed",
      verification: "unverified",
      source: "social",
      description:
        "Report of unusual odor; investigation found no actionable hazard.",
      media: [
        {
          type: "image",
          url:
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
        },
      ],
      audit: [
        {
          id: "A5",
          actor: "Dana Lee",
          action: "Dismissed after site check",
          at: "2025-09-02T14:45:00Z",
        },
      ],
    },
  ];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function toCSV(rows: HazardReport[]) {
  const header = [
    "ID",
    "Hazard Type",
    "Location",
    "Date",
    "Status",
    "Verification",
    "Source",
    "Description",
  ];
  const body = rows.map((r) => [
    r.id,
    r.hazardType,
    r.location,
    formatDate(r.date),
    r.status,
    r.verification,
    r.source,
    `"${r.description.replace(/"/g, '""')}"`,
  ]);
  return [header.join(","), ...body.map((b) => b.join(","))].join("\n");
}

export default function HazardReportManagement({
  className,
  initialData,
  onExportCSV,
  onStatusChange,
}: Props) {
  const [data, setData] = React.useState<HazardReport[]>(
    initialData ?? generateSampleData()
  );
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string | undefined>(
    undefined
  );
  const [statusFilter, setStatusFilter] = React.useState<
    HazardStatus | "all" | undefined
  >(undefined);
  const [verificationFilter, setVerificationFilter] = React.useState<
    Verification | "all" | undefined
  >(undefined);
  const [sourceFilter, setSourceFilter] = React.useState<
    (typeof SOURCES)[number] | "all" | undefined
  >(undefined);
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [expandedFilters, setExpandedFilters] = React.useState(false);

  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<HazardReport | null>(
    null
  );

  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;

    return data.filter((r) => {
      if (q) {
        const txt =
          `${r.id} ${r.hazardType} ${r.location} ${r.description}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      if (typeFilter && r.hazardType !== typeFilter) return false;
      if (statusFilter && statusFilter !== "all" && r.status !== statusFilter)
        return false;
      if (
        verificationFilter &&
        verificationFilter !== "all" &&
        r.verification !== verificationFilter
      )
        return false;
      if (sourceFilter && sourceFilter !== "all" && r.source !== sourceFilter)
        return false;
      const d = new Date(r.date);
      if (sDate && d < sDate) return false;
      if (eDate && d > new Date(eDate.getTime() + 24 * 60 * 60 * 1000 - 1))
        return false;
      return true;
    });
  }, [
    data,
    query,
    typeFilter,
    statusFilter,
    verificationFilter,
    sourceFilter,
    startDate,
    endDate,
  ]);

  const sorted = React.useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      let va: any;
      let vb: any;
      switch (sortKey) {
        case "date":
          va = new Date(a.date).getTime();
          vb = new Date(b.date).getTime();
          break;
        case "hazardType":
          va = a.hazardType;
          vb = b.hazardType;
          break;
        case "location":
          va = a.location;
          vb = b.location;
          break;
        case "source":
          va = a.source;
          vb = b.source;
          break;
        case "status":
          va = a.status;
          vb = b.status;
          break;
        default:
          va = 0;
          vb = 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  function onSelectAllChange(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      for (const r of paged) next[r.id] = true;
    }
    setSelected((prev) => ({ ...prev, ...next }));
  }

  function getSelectedIds() {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  async function applyBulkStatus(newStatus: HazardStatus) {
    const ids = getSelectedIds();
    if (ids.length === 0) {
      toast("No reports selected", {
        description: "Select at least one report to apply a bulk action.",
      });
      return;
    }
    // optimistic update
    setData((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: newStatus } : r))
    );
    toast("Status updated", {
      description: `Updated ${ids.length} report${ids.length > 1 ? "s" : ""} to ${STATUS_META[newStatus].label}.`,
    });
    try {
      await onStatusChange?.(ids, newStatus);
    } catch {
      toast("Failed to persist status", {
        description: "Reverting changes. Please try again.",
      });
      setData((prev) =>
        prev.map((r) =>
          ids.includes(r.id) ? { ...r, status: "in_review" } : r
        )
      );
    }
  }

  function exportCSV(rows: HazardReport[]) {
    const csv = toCSV(rows);
    if (onExportCSV) {
      onExportCSV(csv);
      return;
    }
    if (typeof window !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hazard-reports-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Exported CSV", { description: "Your CSV download has started." });
    }
  }

  function exportPDF() {
    if (typeof window !== "undefined") {
      toast("Generating PDF", {
        description: "Using browser print to save as PDF.",
      });
      window.print();
    }
  }

  function openDetails(r: HazardReport) {
    setActiveReport(r);
    setDetailsOpen(true);
  }

  function updateSingleStatus(id: string, next: HazardStatus) {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    toast("Status updated", {
      description: `${id} set to ${STATUS_META[next].label}.`,
    });
    onStatusChange?.([id], next);
  }

  return (
    <section
      className={cn(
        "w-full max-w-full bg-card border rounded-xl shadow-sm",
        "p-4 sm:p-6",
        className
      )}
      aria-label="Hazard report management"
    >
      <div className="flex w-full items-start gap-3 sm:gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">
            Hazard Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Review, verify, and manage incoming hazard reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-secondary text-secondary-foreground"
            onClick={() => exportCSV(sorted)}
            aria-label="Export CSV"
          >
            <TableIcon className="size-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="bg-secondary text-secondary-foreground"
            onClick={exportPDF}
            aria-label="Export PDF"
          >
            <FileCheck2 className="size-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, type, location..."
              aria-label="Search"
              className="bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-secondary text-secondary-foreground"
              onClick={() => setExpandedFilters((v) => !v)}
              aria-expanded={expandedFilters}
              aria-controls="advanced-filters"
            >
              <ListFilterPlus className="size-4 mr-2" />
              Filters
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-secondary">
                  <Columns3 className="size-4 mr-2" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>Set status for selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => applyBulkStatus("new")}>
                  <span className="inline-flex items-center gap-2">
                    <CircleDot className="size-4" />
                    New
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyBulkStatus("in_review")}>
                  <span className="inline-flex items-center gap-2">
                    <ListFilter className="size-4" />
                    In Review
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyBulkStatus("verified")}>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Verified
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyBulkStatus("dismissed")}>
                  <span className="inline-flex items-center gap-2">
                    <FunnelPlus className="size-4" />
                    Dismissed
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {expandedFilters && (
          <div
            id="advanced-filters"
            className="rounded-lg border bg-muted/50 p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="hazard-type">Hazard type</Label>
                <Select
                  onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}
                  defaultValue="all"
                >
                  <SelectTrigger id="hazard-type" className="bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {HAZARD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(v) =>
                    setStatusFilter(v === "all" ? undefined : (v as HazardStatus | "all"))
                  }
                  defaultValue="all"
                >
                  <SelectTrigger id="status" className="bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="verification">Verification</Label>
                <Select
                  onValueChange={(v) =>
                    setVerificationFilter(
                      v === "all" ? undefined : (v as Verification | "all")
                    )
                  }
                  defaultValue="all"
                >
                  <SelectTrigger id="verification" className="bg-white">
                    <SelectValue placeholder="Select verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="source">Source</Label>
                <Select
                  onValueChange={(v) =>
                    setSourceFilter(v === "all" ? undefined : (v as any))
                  }
                  defaultValue="all"
                >
                  <SelectTrigger id="source" className="bg-white">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Filter by location"
                  className="bg-white"
                  onChange={(e) =>
                    setQuery((q) => `${q.split(" loc:")[0]} loc:${e.target.value}`)
                  }
                />
                <small className="text-muted-foreground">
                  Tip: Use search with loc:YourLocation for precise filtering.
                </small>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="secondary"
                className="bg-secondary"
                onClick={() => {
                  setQuery("");
                  setTypeFilter(undefined);
                  setStatusFilter(undefined);
                  setVerificationFilter(undefined);
                  setSourceFilter(undefined);
                  setStartDate("");
                  setEndDate("");
                  toast("Filters cleared");
                }}
              >
                Reset
              </Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={() => toast("Filters applied")}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-soft">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all on page"
                  checked={
                    paged.length > 0 &&
                    paged.every((r) => selected[r.id])
                  }
                  onCheckedChange={(c) => onSelectAllChange(Boolean(c))}
                />
              </TableHead>
              <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => toggleSort("hazardType")}>
                <div className="flex items-center gap-2">
                  Type
                  <SortIndicator active={sortKey === "hazardType"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => toggleSort("location")}>
                <div className="flex items-center gap-2">
                  Location
                  <SortIndicator active={sortKey === "location"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="min-w-[160px] cursor-pointer select-none" onClick={() => toggleSort("date")}>
                <div className="flex items-center gap-2">
                  Date
                  <SortIndicator active={sortKey === "date"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="min-w-[140px] cursor-pointer select-none" onClick={() => toggleSort("status")}>
                <div className="flex items-center gap-2">
                  Status
                  <SortIndicator active={sortKey === "status"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="min-w-[140px]">Verification</TableHead>
              <TableHead className="min-w-[120px] cursor-pointer select-none" onClick={() => toggleSort("source")}>
                <div className="flex items-center gap-2">
                  Source
                  <SortIndicator active={sortKey === "source"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No reports found with the current filters.
                </TableCell>
              </TableRow>
            )}
            {paged.map((r) => (
              <TableRow key={r.id} className="hover:bg-accent/30">
                <TableCell className="align-top">
                  <Checkbox
                    aria-label={`Select ${r.id}`}
                    checked={!!selected[r.id]}
                    onCheckedChange={(c) =>
                      setSelected((prev) => ({ ...prev, [r.id]: Boolean(c) }))
                    }
                  />
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col min-w-0">
                    <div className="font-medium">{r.hazardType}</div>
                    <small className="text-muted-foreground">{r.id}</small>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="min-w-0 max-w-[280px] break-words">{r.location}</div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {formatDate(r.date)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="inline-flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", STATUS_META[r.status].dot)} />
                    <Badge className={cn("rounded-full", STATUS_META[r.status].color)}>
                      {STATUS_META[r.status].label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge className={cn("rounded-full", VERIFICATION_META[r.verification].color)}>
                    {VERIFICATION_META[r.verification].label}
                  </Badge>
                </TableCell>
                <TableCell className="align-top capitalize">{r.source}</TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center justify-end gap-2">
                    <Select
                      onValueChange={(v) =>
                        updateSingleStatus(r.id, v as HazardStatus)
                      }
                      value={r.status}
                    >
                      <SelectTrigger
                        className="h-8 w-[130px] bg-white"
                        aria-label={`Change status for ${r.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-secondary"
                      onClick={() => openDetails(r)}
                      aria-label={`Open details for ${r.id}`}
                    >
                      <ShieldCheck className="size-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} -{" "}
          {Math.min(page * pageSize, sorted.length)} of {sorted.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              {activeReport?.hazardType} • {activeReport?.id}
            </DialogTitle>
            <DialogDescription>
              Verify details, inspect media, and update status. All changes are logged.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3 space-y-3">
              <div className="rounded-lg border bg-popover p-3">
                <h4 className="font-semibold text-sm mb-2">Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("rounded-full", activeReport ? STATUS_META[activeReport.status].color : "")}>
                      {activeReport ? STATUS_META[activeReport.status].label : ""}
                    </Badge>
                    <Badge className={cn("rounded-full", activeReport ? VERIFICATION_META[activeReport.verification].color : "")}>
                      {activeReport ? VERIFICATION_META[activeReport.verification].label : ""}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {activeReport?.location} • {activeReport ? formatDate(activeReport.date) : ""}
                  </div>
                  <p className="mt-2 break-words">{activeReport?.description}</p>
                </div>
              </div>

              <div className="rounded-lg border bg-popover p-3">
                <h4 className="font-semibold text-sm mb-2">Media</h4>
                <div className="grid grid-cols-2 gap-2">
                  {activeReport?.media.map((m, i) => (
                    <div
                      key={i}
                      className="relative aspect-video rounded-md overflow-hidden bg-muted"
                    >
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt={`${activeReport.hazardType} evidence ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={m.url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {activeReport?.media.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No media attached.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="rounded-lg border bg-popover p-3">
                <h4 className="font-semibold text-sm mb-2">Verification</h4>
                <Tabs defaultValue="workflow">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="workflow">Workflow</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                  </TabsList>
                  <TabsContent value="workflow" className="mt-3">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <Select
                          value={activeReport?.status}
                          onValueChange={(v) => {
                            if (!activeReport) return;
                            updateSingleStatus(activeReport.id, v as HazardStatus);
                            setActiveReport({ ...activeReport, status: v as HazardStatus });
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Verification</Label>
                        <Select
                          value={activeReport?.verification}
                          onValueChange={(v) => {
                            if (!activeReport) return;
                            setActiveReport({
                              ...activeReport,
                              verification: v as Verification,
                            });
                            setData((prev) =>
                              prev.map((r) =>
                                r.id === activeReport.id
                                  ? { ...r, verification: v as Verification }
                                  : r
                              )
                            );
                            toast("Verification updated", {
                              description: `${activeReport.id} marked ${v}.`,
                            });
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select verification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unverified">Unverified</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full bg-primary text-primary-foreground"
                        onClick={() =>
                          toast("Report reviewed", {
                            description:
                              "Your verification changes have been saved.",
                          })
                        }
                      >
                        <ShieldCheck className="size-4 mr-2" />
                        Confirm Changes
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="audit" className="mt-3">
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                      {activeReport?.audit.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-start gap-2 rounded-md border p-2 bg-white"
                        >
                          <div className="mt-1">
                            <CircleDot className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm">
                              <span className="font-medium">{a.actor}</span>{" "}
                              <span className="text-muted-foreground">
                                {a.action}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(a.at)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeReport?.audit.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No audit entries yet.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SortIndicator({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-col items-center justify-center leading-none",
        active ? "opacity-100" : "opacity-30"
      )}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        className={cn(
          "transition-transform",
          dir === "asc" ? "rotate-180" : "rotate-0"
        )}
      >
        <path
          d="M7 10l5-5 5 5H7zM7 14h10l-5 5-5-5z"
          fill="currentColor"
          className="text-muted-foreground"
        />
      </svg>
    </span>
  );
}