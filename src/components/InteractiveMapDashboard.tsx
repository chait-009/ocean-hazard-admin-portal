"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, useId } from "react";
import type { CSSProperties } from "react";
import { Map as MapIcon, ChevronsRight, ZoomIn, MapPin, MapPinCheck, MapPinX } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type LeafletModule = typeof import("leaflet");

type HazardStatus = "unverified" | "under_review" | "verified" | "false_alarm";
type HazardSource = "citizen" | "sensor" | "social" | "official" | "other";

export interface HazardReport {
  id: string;
  lat: number;
  lng: number;
  type: string;
  status: HazardStatus;
  source: HazardSource;
  timestamp: string; // ISO string
  description?: string;
  mediaUrls?: string[]; // Must be Unsplash URLs if provided
  title?: string;
  tags?: string[];
  personName?: string;
  locationName?: string;
}

interface InteractiveMapDashboardProps {
  className?: string;
  style?: CSSProperties;
  reports: HazardReport[];
  initialCenter?: [number, number];
  initialZoom?: number;
  showHeatmapToggle?: boolean;
  showClusterToggle?: boolean;
  defaultHeatmap?: boolean;
  defaultCluster?: boolean;
  onFilterChange?: (filters: ActiveFilters) => void;
  onTimelineChange?: (time: number) => void; // Unix ms
  language?: "en" | "hi";
}

interface ActiveFilters {
  hazardType: string | "all";
  status: HazardStatus | "all";
  source: HazardSource | "all";
  timeStart?: number; // Unix ms
  timeEnd?: number; // Unix ms
  heatmap: boolean;
  clustering: boolean;
  tagsQuery?: string;
}

const defaultCenter: [number, number] = [37.773972, -122.431297]; // SF
const defaultZoom = 11;

const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, {
  ssr: false,
});
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, {
  ssr: false,
});
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, {
  ssr: false,
});
const LayerGroup = dynamic(
  async () => (await import("react-leaflet")).LayerGroup,
  { ssr: false }
);

const statusStyles: Record<
  HazardStatus,
  { bg: string; ring: string; text: string; label: string }
> = {
  unverified: {
    bg: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    label: "Unverified",
  },
  under_review: {
    bg: "bg-sky-500",
    ring: "ring-sky-200",
    text: "text-sky-700",
    label: "Under Review",
  },
  verified: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    label: "Verified",
  },
  false_alarm: {
    bg: "bg-rose-500",
    ring: "ring-rose-200",
    text: "text-rose-700",
    label: "False Alarm",
  },
};

function formatDate(ts: string | number) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function InteractiveMapDashboard({
  className,
  style,
  reports,
  initialCenter = defaultCenter,
  initialZoom = defaultZoom,
  showHeatmapToggle = true,
  showClusterToggle = true,
  defaultHeatmap = false,
  defaultCluster = true,
  onFilterChange,
  onTimelineChange,
  language = "en",
}: InteractiveMapDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapKey = useId();

  // simple i18n labels
  const t = useMemo(() => {
    const en = {
      filters: "Hazard Filters",
      type: "Type",
      status: "Status",
      source: "Source",
      search: "Search",
      tags: "Tags",
      allTypes: "All types",
      allStatuses: "All statuses",
      allSources: "All sources",
      heatmap: "Heatmap",
      cluster: "Cluster",
      timeRange: "Time range",
      timeline: "Timeline replay",
      play: "Play",
      pause: "Pause",
      jumpLatest: "Jump to latest",
      legend: "Legend",
      exportCSV: "Export CSV",
      exportPDF: "Export PDF",
      viewDetails: "View details",
      location: "Location",
      person: "Person",
      tagsLabel: "Tags (comma separated)",
    } as const;
    const hi = {
      filters: "खतरा फ़िल्टर",
      type: "प्रकार",
      status: "स्थिति",
      source: "स्रोत",
      search: "खोज",
      tags: "टैग",
      allTypes: "सभी प्रकार",
      allStatuses: "सभी स्थितियाँ",
      allSources: "सभी स्रोत",
      heatmap: "हीटमैप",
      cluster: "क्लस्टर",
      timeRange: "समय सीमा",
      timeline: "समयरेखा",
      play: "चलाएँ",
      pause: "रोकें",
      jumpLatest: "नवीनतम",
      legend: "कुंजी",
      exportCSV: "CSV निर्यात",
      exportPDF: "PDF निर्यात",
      viewDetails: "विवरण देखें",
      location: "स्थान",
      person: "व्यक्ति",
      tagsLabel: "टैग (कॉमा से अलग)",
    } as const;
    return language === "hi" ? hi : en;
  }, [language]);

  // Load Leaflet JS + CSS only on client
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const L = await import("leaflet");
        if (cancelled) return;
        leafletRef.current = L;
        // Inject Leaflet CSS if not present
        if (typeof window !== "undefined") {
          const id = "leaflet-css";
          if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            link.integrity =
              "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
            link.crossOrigin = "";
            const headEl = document.head || document.body || document.documentElement;
            headEl && headEl.appendChild(link);
          }
        }
        setMounted(true);
      } catch (e) {
        console.error("Failed to load Leaflet", e);
        toast.error("Failed to initialize map");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine time domain
  const timeDomain = useMemo(() => {
    if (!reports?.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const r of reports) {
      const t = new Date(r.timestamp).getTime();
      if (!Number.isFinite(t)) continue;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }, [reports]);

  const [filters, setFilters] = useState<ActiveFilters>({
    hazardType: "all",
    status: "all",
    source: "all",
    timeStart: timeDomain?.min,
    timeEnd: timeDomain?.max,
    heatmap: defaultHeatmap,
    clustering: defaultCluster,
    tagsQuery: "",
  });

  // Timeline pointer (ms)
  const [timeline, setTimeline] = useState<number | undefined>(timeDomain?.max);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // If time domain updates (e.g., new data), sync filters defaults
    if (timeDomain) {
      setFilters((f) => ({
        ...f,
        timeStart: timeDomain.min,
        timeEnd: timeDomain.max,
      }));
      setTimeline(timeDomain.max);
    }
  }, [timeDomain?.min, timeDomain?.max]);

  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  // Simple play loop for timeline
  useEffect(() => {
    if (!isPlaying || !timeDomain || timeline == null) return;
    const step = Math.max(1, Math.floor((timeDomain.max - timeDomain.min) / 120)); // 120 steps
    const id = window.setInterval(() => {
      setTimeline((prev) => {
        if (prev == null) return timeDomain.min;
        const next = prev + step;
        if (next >= timeDomain.max) {
          setIsPlaying(false);
          return timeDomain.max;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying, timeDomain, timeline]);

  useEffect(() => {
    if (timeline != null) onTimelineChange?.(timeline);
  }, [timeline, onTimelineChange]);

  // Derived filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filters.hazardType !== "all" && r.type !== filters.hazardType) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.source !== "all" && r.source !== filters.source) return false;
      const t0 = new Date(r.timestamp).getTime();
      if (filters.timeStart && t0 < filters.timeStart) return false;
      if (filters.timeEnd && t0 > filters.timeEnd) return false;
      if (timeline != null && t0 > timeline) return false; // historical replay up to timeline
      if (filters.tagsQuery && filters.tagsQuery.trim().length > 0) {
        const needles = filters.tagsQuery
          .toLowerCase()
          .split(/[\,\s]+/)
          .filter(Boolean);
        if (needles.length) {
          const hay = (r.tags ?? []).map((x) => x.toLowerCase());
          const match = needles.every((n) => hay.includes(n));
          if (!match) return false;
        }
      }
      return true;
    });
  }, [reports, filters, timeline]);

  // Simple heat "intensity" using density buckets (green/yellow/red)
  const heatPoints = useMemo(() => {
    if (!filters.heatmap) return [] as { lat: number; lng: number; weight: number }[];
    // bucket by grid (coarser for overview)
    const gridSize = 0.25; // ~25km
    const buckets = new Map<string, { lat: number; lng: number; count: number }>();
    for (const r of filteredReports) {
      const gx = Math.floor(r.lng / gridSize);
      const gy = Math.floor(r.lat / gridSize);
      const key = `${gx}:${gy}`;
      const centerLng = (gx + 0.5) * gridSize;
      const centerLat = (gy + 0.5) * gridSize;
      const b = buckets.get(key);
      if (b) b.count += 1;
      else buckets.set(key, { lat: centerLat, lng: centerLng, count: 1 });
    }
    let max = 0;
    for (const b of buckets.values()) max = Math.max(max, b.count);
    if (max === 0) return [] as { lat: number; lng: number; weight: number }[];
    return Array.from(buckets.values()).map((b) => ({ lat: b.lat, lng: b.lng, weight: b.count / max }));
  }, [filteredReports, filters.heatmap]);

  function densityColor(w: number) {
    // low->green, mid->yellow, high->red
    if (w >= 0.66) return "#ef4444"; // red
    if (w >= 0.33) return "#f59e0b"; // yellow
    return "#10b981"; // green
  }

  // Provide leaflet-based icons for each status (fixes ReferenceError: statusIcons is not defined)
  const statusIcons = useMemo<Record<HazardStatus, any> | undefined>(() => {
    const L = leafletRef.current;
    if (!L) return undefined;
    const make = (hex: string) =>
      L.divIcon({
        className: "status-pin",
        html: `<div style="transform:translate(-50%,-100%);">
                 <div style="width:14px;height:14px;border-radius:9999px;background:${hex};
                 box-shadow:0 0 0 2px rgba(255,255,255,0.95),0 6px 14px rgba(0,0,0,0.18)"></div>
               </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 14],
      });
    return {
      unverified: make("#f59e0b"),
      under_review: make("#0ea5e9"),
      verified: make("#10b981"),
      false_alarm: make("#ef4444"),
    };
  }, [mounted]);

  // Unique sets for select options
  const uniqueTypes = useMemo(
    () => Array.from(new Set(reports.map((r) => r.type))).sort(),
    [reports]
  );
  const uniqueSources = useMemo(
    () => Array.from(new Set(reports.map((r) => r.source))).sort(),
    [reports]
  );

  // export helpers
  const exportCSV = useCallback(() => {
    const headers = [
      "id",
      "title",
      "type",
      "status",
      "source",
      "timestamp",
      "lat",
      "lng",
      "locationName",
      "personName",
      "tags",
      "description",
    ];
    const rows = filteredReports.map((r) => [
      r.id,
      safe(r.title),
      r.type,
      r.status,
      r.source,
      new Date(r.timestamp).toISOString(),
      r.lat,
      r.lng,
      safe(r.locationName),
      safe(r.personName),
      (r.tags ?? []).join("|"),
      safe(r.description),
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hazard-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredReports]);

  const exportPDF = useCallback(() => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const rows = filteredReports
      .map(
        (r) => `
        <tr>
          <td style="padding:6px;border:1px solid #ddd">${escapeHTML(r.id)}</td>
          <td style="padding:6px;border:1px solid #ddd">${escapeHTML(r.title || capitalize(r.type))}</td>
          <td style="padding:6px;border:1px solid #ddd">${escapeHTML(r.status)}</td>
          <td style="padding:6px;border:1px solid #ddd">${escapeHTML(r.source)}</td>
          <td style="padding:6px;border:1px solid #ddd">${escapeHTML(formatDate(r.timestamp))}</td>
          <td style="padding:6px;border:1px solid #ddd">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</td>
        </tr>`
      )
      .join("");
    w.document.write(`
      <html>
        <head>
          <title>Hazard Reports</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Hazard Reports (${filteredReports.length})</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Source</th>
                <th>Time</th>
                <th>Lat/Lng</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  }, [filteredReports]);

  // UI helpers
  const sliderRange: [number, number] = [
    filters.timeStart ?? timeDomain?.min ?? Date.now() - 1000 * 60 * 60 * 24 * 30,
    filters.timeEnd ?? timeDomain?.max ?? Date.now(),
  ];

  return (
    <div
      className={cn(
        "relative w-full max-w-full bg-card rounded-lg border border-border overflow-hidden",
        className
      )}
      style={style}
    >
      {/* Map container */}
      <div className="relative w-full h-[540px] sm:h-[620px] md:h-[720px] bg-muted">
        {mounted ? (
          <MapContainer
            key={mapKey}
            center={initialCenter}
            zoom={initialZoom}
            scrollWheelZoom
            className="w-full h-full"
          >
            {/* Base layer (default Streets) */}
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Heat layer (density buckets with colored circles) */}
            {filters.heatmap && (
              <LayerGroup>
                {leafletRef.current &&
                  heatPoints.map((p, idx) => {
                    const size = 36 + Math.round(p.weight * 44);
                    const color = densityColor(p.weight);
                    return (
                      <Marker
                        key={`heat-${idx}`}
                        position={[p.lat, p.lng]}
                        icon={
                          leafletRef.current!.divIcon({
                            className: "heat-point",
                            html: `<div style="
                                    width:${size}px;height:${size}px;border-radius:9999px;
                                    background:radial-gradient(${color}aa 0%, ${color}55 40%, ${color}00 70%);
                                    transform:translate(-50%,-50%);
                                    filter: blur(2px);
                                  "></div>`,
                            iconSize: [1, 1],
                            iconAnchor: [0, 0],
                          })
                        }
                        opacity={1}
                        interactive={false}
                      />
                    );
                  })}
              </LayerGroup>
            )}

            {/* Markers layer */}
            <LayerGroup>
              {filters.clustering
                ? renderClusteredMarkers({
                    L: leafletRef.current,
                    reports: filteredReports,
                    statusIcons,
                  })
                :
                  leafletRef.current &&
                  filteredReports.map((r) => (
                    <Marker
                      key={r.id}
                      position={[r.lat, r.lng]}
                      icon={statusIcons?.[r.status]}
                      opacity={0.95}
                    >
                      <Popup className="!min-w-[260px] !max-w-[360px]">
                        <div className="w-full max-w-full">
                          <div className="flex items-center gap-2 mb-2">
                            {renderStatusIcon(r.status)}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight truncate">
                                {r.title ?? capitalize(r.type)}
                              </p>
                              <p className="text-xs text-muted-foreground leading-tight">
                                {formatDate(r.timestamp)}
                              </p>
                            </div>
                          </div>

                          {r.description && (
                            <p className="text-sm text-foreground/90 mb-2 break-words">
                              {r.description}
                            </p>
                          )}

                          <details className="mt-1">
                            <summary className="text-xs text-primary cursor-pointer select-none">{t.viewDetails}</summary>
                            <div className="mt-2 space-y-2">
                              {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-1">
                                  {r.mediaUrls.slice(0, 6).map((url, i) => (
                                    <a
                                      key={`${r.id}-m-${i}`}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="relative block aspect-video overflow-hidden rounded-sm bg-muted"
                                    >
                                      <img
                                        src={url}
                                        alt="Report media"
                                        className="w-full h-full object-cover transition-opacity duration-200"
                                        loading="lazy"
                                      />
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {r.locationName ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                                </span>
                                {r.personName && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    {t.person}: {r.personName}
                                  </span>
                                )}
                              </div>
                              {r.tags && r.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {r.tags.map((tag, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
            </LayerGroup>

            {/* Built-in Leaflet zoom control is present; add our quick zoom-in as example micro-interaction */}
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapIcon className="w-5 h-5 animate-pulse" />
              <span className="text-sm">Initializing map…</span>
            </div>
          </div>
        )}

        {/* Control Panel - left */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 sm:right-auto sm:w-[360px] z-[400]">
          <Card className="pointer-events-auto bg-popover/95 backdrop-blur border-border shadow-sm">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">{t.filters}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {showHeatmapToggle && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="heatmap-toggle"
                        checked={filters.heatmap}
                        onCheckedChange={(v) =>
                          setFilters((f) => ({ ...f, heatmap: v }))
                        }
                      />
                      <Label htmlFor="heatmap-toggle" className="text-xs">
                        {t.heatmap}
                      </Label>
                    </div>
                  )}
                  {showClusterToggle && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cluster-toggle"
                        checked={filters.clustering}
                        onCheckedChange={(v) =>
                          setFilters((f) => ({ ...f, clustering: v }))
                        }
                      />
                      <Label htmlFor="cluster-toggle" className="text-xs">
                        {t.cluster}
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <Label htmlFor="type" className="text-xs text-muted-foreground">
                      {t.type}
                    </Label>
                    <Select
                      value={filters.hazardType}
                      onValueChange={(v) =>
                        setFilters((f) => ({
                          ...f,
                          hazardType: v as ActiveFilters["hazardType"],
                        }))
                      }
                    >
                      <SelectTrigger id="type" className="h-9">
                        <SelectValue placeholder={t.allTypes} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allTypes}</SelectItem>
                        {uniqueTypes.map((t0) => (
                          <SelectItem key={t0} value={t0}>
                            {capitalize(t0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="status" className="text-xs text-muted-foreground">
                      {t.status}
                    </Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((f) => ({
                          ...f,
                          status: v as ActiveFilters["status"],
                        }))
                      }
                    >
                      <SelectTrigger id="status" className="h-9">
                        <SelectValue placeholder={t.allStatuses} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allStatuses}</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="false_alarm">False Alarm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <Label htmlFor="source" className="text-xs text-muted-foreground">
                      {t.source}
                    </Label>
                    <Select
                      value={filters.source}
                      onValueChange={(v) =>
                        setFilters((f) => ({ ...f, source: v as ActiveFilters["source"] }))
                      }
                    >
                      <SelectTrigger id="source" className="h-9">
                        <SelectValue placeholder={t.allSources} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allSources}</SelectItem>
                        {uniqueSources.map((s) => (
                          <SelectItem key={s} value={s}>
                            {capitalize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="search" className="text-xs text-muted-foreground">
                      {t.search}
                    </Label>
                    <Input
                      id="search"
                      placeholder="Type, description…"
                      className="h-9"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        // Optional: local lightweight search applied to type/description
                        // We'll filter on top of existing filters
                        // To keep performance, only toasts when many results
                        if (q.length > 2) {
                          const count = filteredReports.filter(
                            (r) =>
                              r.type.toLowerCase().includes(q) ||
                              (r.description ?? "").toLowerCase().includes(q)
                          ).length;
                          if (count === 0) {
                            // gentle feedback
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Tags filter */}
                <div className="min-w-0">
                  <Label htmlFor="tags" className="text-xs text-muted-foreground">
                    {t.tagsLabel}
                  </Label>
                  <Input
                    id="tags"
                    placeholder="flood, cyclone"
                    className="h-9"
                    value={filters.tagsQuery}
                    onChange={(e) => setFilters((f) => ({ ...f, tagsQuery: e.target.value }))}
                  />
                </div>

                {/* Time range filter */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      {t.timeRange}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {timeDomain
                        ? `${new Date(sliderRange[0]).toLocaleDateString()} - ${new Date(
                            sliderRange[1]
                          ).toLocaleDateString()}`
                        : "—"}
                    </span>
                  </div>
                  {timeDomain ? (
                    <Slider
                      value={[filters.timeStart ?? timeDomain.min, filters.timeEnd ?? timeDomain.max]}
                      min={timeDomain.min}
                      max={timeDomain.max}
                      step={60 * 60 * 1000}
                      onValueChange={([min, max]) =>
                        setFilters((f) => ({ ...f, timeStart: min, timeEnd: max }))
                      }
                    />
                  ) : (
                    <div className="h-2 rounded bg-muted" />
                  )}
                </div>

                {/* Timeline replay */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-primary" />
                      <Label className="text-xs text-muted-foreground">
                        {t.timeline}
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeline ? new Date(timeline).toLocaleString() : "—"}
                    </span>
                  </div>
                  {timeDomain ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isPlaying ? "secondary" : "default"}
                        onClick={() => setIsPlaying((p) => !p)}
                      >
                        {isPlaying ? t.pause : t.play}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <Slider
                          value={[timeline ?? timeDomain.min]}
                          min={timeDomain.min}
                          max={timeDomain.max}
                          step={60 * 60 * 1000}
                          onValueChange={([t0]) => setTimeline(t0)}
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        onClick={() => setTimeline(timeDomain.max)}
                        aria-label="Jump to latest"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-2 rounded bg-muted" />
                  )}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      "unverified",
                      "under_review",
                      "verified",
                      "false_alarm",
                    ] as HazardStatus[]
                  ).map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1"
                    >
                      <span
                        className={cn(
                          "inline-block w-2.5 h-2.5 rounded-full ring-2",
                          statusStyles[s].ring
                        )}
                        style={{ backgroundColor: statusToColor(s) }}
                        aria-hidden
                      />
                      <span className="text-xs">{statusStyles[s].label}</span>
                    </div>
                  ))}
                </div>

                {/* Export actions */}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={exportCSV}>
                    {t.exportCSV}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={exportPDF}>
                    {t.exportPDF}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function safe(v?: string) {
  return v ?? "";
}
function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function escapeHTML(s?: string) {
  return (s ?? "").replace(/[&<>"]{1}/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c]!));
}

// Render colored status icon in popup header
function renderStatusIcon(status: HazardStatus) {
  const classes = "w-4 h-4";
  switch (status) {
    case "verified":
      return <MapPinCheck className={classes + " text-emerald-600"} />;
    case "under_review":
      return <MapPin className={classes + " text-sky-600"} />;
    case "unverified":
      return <MapPin className={classes + " text-amber-600"} />;
    case "false_alarm":
      return <MapPinX className={classes + " text-rose-600"} />;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Simple zoom helper using Leaflet map instance if available
function zoomMap(L: LeafletModule | null, delta: number) {
  if (!L) return;
  // Try to find the first map instance
  // @ts-expect-error internal
  const map = (L as any).map?.instances?.[0]?._leaflet_id
    ? (L as any).map.instances[0]
    : null;
  if (map && typeof map.setZoom === "function") {
    map.setZoom(map.getZoom() + delta);
  } else {
    // fallback: dispatch wheel event is not safe, ignore
  }
}

// Minimal icon for zoom-out using available lucide icons list
function MapPinMinusIcon() {
  // Since MapPinMinus is in the available list as 'MapPinMinus' but not imported to avoid unused import rule,
  // we re-use a composed icon with MapPin and a small bar
  return (
    <div className="relative w-4 h-4">
      <MapPin className="w-4 h-4 text-foreground" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="block w-2 h-[1.5px] bg-foreground rounded-sm" />
      </div>
    </div>
  );
}

// A lightweight, grid-based clustering: bucket points into small lat/lng cells
function renderClusteredMarkers({
  L,
  reports,
  statusIcons,
}: {
  L: LeafletModule | null;
  reports: HazardReport[];
  statusIcons: Record<HazardStatus, any>;
}) {
  if (!L) return null;

  // Fixed grid size in degrees (~6-7km at equator); a bit larger to group nearby coastal points
  const gridSize = 0.06;

  type BucketKey = string;
  const buckets = new Map<
    BucketKey,
    { lat: number; lng: number; items: HazardReport[] }
  >();

  for (const r of reports) {
    const gx = Math.floor(r.lng / gridSize);
    const gy = Math.floor(r.lat / gridSize);
    const key = `${gx}:${gy}`;
    const centerLng = (gx + 0.5) * gridSize;
    const centerLat = (gy + 0.5) * gridSize;
    if (!buckets.has(key)) {
      buckets.set(key, { lat: centerLat, lng: centerLng, items: [r] });
    } else {
      buckets.get(key)!.items.push(r);
    }
  }

  const items: React.ReactNode[] = [];
  let i = 0;
  for (const bucket of buckets.values()) {
    const count = bucket.items.length;
    if (count === 1) {
      const r = bucket.items[0]!;
      items.push(
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={statusIcons?.[r.status]}
          opacity={0.95}
        >
          <Popup className="!min-w-[260px] !max-w-[360px]">
            <div className="w-full max-w-full">
              <div className="flex items-center gap-2 mb-2">
                {renderStatusIcon(r.status)}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {capitalize(r.type)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {formatDate(r.timestamp)}
                  </p>
                </div>
              </div>
              {r.description && (
                <p className="text-sm text-foreground/90 mb-2 break-words">
                  {r.description}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      );
    } else {
      // Cluster marker: size and color blend
      const dominantStatus = dominantStatusIn(bucket.items);
      const color = statusToColor(dominantStatus);
      const icon = L.divIcon({
        className: "cluster-pin",
        html: `
          <div style="
            display:flex;align-items:center;justify-content:center;
            width:${24 + Math.min(18, count)}px;
            height:${24 + Math.min(18, count)}px;
            border-radius:9999px;
            background:${color};
            color:white;
            font-weight:700;
            font-size:12px;
            line-height:1;
            box-shadow:0 6px 14px rgba(0,0,0,0.18);
            border:2px solid rgba(255,255,255,0.95);
          ">${count}</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      items.push(
        <Marker
          key={`c-${i++}`}
          position={[bucket.lat, bucket.lng]}
          icon={icon}
          opacity={0.95}
        >
          <Popup className="!min-w-[260px]">
            <div className="w-full">
              <p className="text-sm font-semibold mb-1">
                {count} reports in area
              </p>
              <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                {bucket.items.slice(0, 10).map((r) => (
                  <li key={r.id} className="text-xs flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full ring-2"
                      style={{
                        backgroundColor: statusToColor(r.status),
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
                      }}
                    />
                    <span className="truncate">
                      {(r.title ?? capitalize(r.type))} • {formatDate(r.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </Marker>
      );
    }
  }

  return items;
}

function dominantStatusIn(items: HazardReport[]): HazardStatus {
  const counts: Record<HazardStatus, number> = {
    unverified: 0,
    under_review: 0,
    verified: 0,
    false_alarm: 0,
  };
  for (const r of items) counts[r.status]++;
  return (Object.keys(counts) as HazardStatus[]).reduce((a, b) =>
    counts[a] >= counts[b] ? a : b
  );
}

// Add module-level color helper for use outside the component
function statusToColor(s: HazardStatus): string {
  switch (s) {
    case "unverified":
      return "#f59e0b";
    case "under_review":
      return "#0ea5e9";
    case "verified":
      return "#10b981";
    case "false_alarm":
      return "#ef4444";
  }
}

// Heat color by normalized weight: low=green, mid=yellow, high=red
function heatColor(weight: number, alpha = 1): string {
  const w = Math.max(0, Math.min(1, weight));
  if (w < 0.33) return `rgba(16,185,129,${alpha})`; // emerald-500
  if (w < 0.66) return `rgba(234,179,8,${alpha})`; // amber-500
  return `rgba(239,68,68,${alpha})`; // rose-500
}