"use client";

import React, { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ChartLine,
  ChartBar,
  TrendingUp,
  TrendingDown,
  ChartPie,
  ChartBarBig,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  Legend,
} from "recharts";

type Platform = "twitter" | "youtube" | "facebook";

export interface SocialMediaAnalyticsProps {
  className?: string;
  defaultPlatforms?: Platform[];
  initialKeywords?: string[];
  defaultDateRange?: "7d" | "14d" | "30d" | "90d";
  onKeywordsChange?: (keywords: string[]) => void;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  twitter: "Twitter",
  youtube: "YouTube",
  facebook: "Facebook",
};

const platformColors: Record<Platform, string> = {
  twitter: "text-[#1DA1F2]",
  youtube: "text-[#FF0000]",
  facebook: "text-[#1877F2]",
};

const seriesColors = {
  positive: "var(--chart-2)",
  neutral: "var(--chart-3)",
  negative: "var(--destructive)",
};

const mockDates = (days: number) => {
  const arr: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    arr.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return arr;
};

const randomIn = (min: number, max: number, seed = 0) =>
  Math.floor(min + (Math.abs(Math.sin(min + max + seed)) % 1) * (max - min + 1));

const seeded = (i: number, j: number) =>
  Math.abs(Math.sin((i + 1) * 9301 + (j + 1) * 49297)) % 1;

const generateSentimentSeries = (days: number, platforms: Platform[]) => {
  const dates = mockDates(days);
  return dates.map((d, i) => {
    // create stable-ish mock values influenced by platform count
    const pCount = platforms.length || 1;
    const base = 20 + Math.round(seeded(i, pCount) * 20);
    const positive = base + Math.round(seeded(i, 2) * 30);
    const neutral = 15 + Math.round(seeded(i, 3) * 20);
    const negative = 10 + Math.round(seeded(i, 5) * 15);
    return {
      date: d,
      positive,
      neutral,
      negative,
    };
  });
};

const MOCK_HASHTAGS = [
  { tag: "#ocean", frequency: 1240 },
  { tag: "#storm", frequency: 980 },
  { tag: "#tsunami", frequency: 540 },
  { tag: "#coast", frequency: 460 },
  { tag: "#flooding", frequency: 420 },
  { tag: "#currents", frequency: 350 },
  { tag: "#ripcurrent", frequency: 290 },
  { tag: "#maritime", frequency: 255 },
  { tag: "#cyclone", frequency: 230 },
  { tag: "#surge", frequency: 210 },
];

type HazardType =
  | "Rip Current"
  | "Flood"
  | "Storm Surge"
  | "High Waves"
  | "Tsunami"
  | "Pollution";

interface HazardPost {
  id: string;
  platform: Platform;
  type: HazardType;
  sentiment: "positive" | "neutral" | "negative";
  content: string;
  timestamp: string;
  confidence: number;
  location?: string;
}

const MOCK_POSTS: HazardPost[] = [
  {
    id: "p1",
    platform: "twitter",
    type: "Rip Current",
    sentiment: "negative",
    content:
      "Strong rip currents reported near North Beach. Lifeguards advising swimmers to stay close to shore. #ripcurrent #ocean",
    timestamp: "2h ago",
    confidence: 0.92,
    location: "North Beach",
  },
  {
    id: "p2",
    platform: "youtube",
    type: "Storm Surge",
    sentiment: "negative",
    content:
      "Live cam shows water levels rising fast as the storm moves inland. Coastal roads are flooding. #storm #surge",
    timestamp: "5h ago",
    confidence: 0.88,
    location: "Bayview",
  },
  {
    id: "p3",
    platform: "facebook",
    type: "Flood",
    sentiment: "negative",
    content:
      "Community group reporting street flooding and blocked drainage after heavy rain. Stay safe everyone.",
    timestamp: "7h ago",
    confidence: 0.83,
    location: "Harbor District",
  },
  {
    id: "p4",
    platform: "twitter",
    type: "High Waves",
    sentiment: "neutral",
    content:
      "Surf advisory in effect with high waves through evening. Experienced surfers only. #coast #waves",
    timestamp: "9h ago",
    confidence: 0.77,
    location: "Sunset Point",
  },
  {
    id: "p5",
    platform: "youtube",
    type: "Tsunami",
    sentiment: "negative",
    content:
      "Explainer: Tsunami watch issued after offshore seismic activity. What to know and how to prepare.",
    timestamp: "12h ago",
    confidence: 0.79,
  },
  {
    id: "p6",
    platform: "facebook",
    type: "Pollution",
    sentiment: "neutral",
    content:
      "Visible oil sheen reported near the marina; authorities notified. Avoid water until cleared.",
    timestamp: "1d ago",
    confidence: 0.74,
    location: "Old Marina",
  },
];

const sentimentTotals = (data: { positive: number; neutral: number; negative: number }[]) =>
  data.reduce(
    (acc, cur) => {
      acc.positive += cur.positive;
      acc.neutral += cur.neutral;
      acc.negative += cur.negative;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

export default function SocialMediaAnalytics({
  className,
  defaultPlatforms = ["twitter", "youtube", "facebook"],
  initialKeywords = ["ocean", "storm", "flooding"],
  defaultDateRange = "14d",
  onKeywordsChange,
}: SocialMediaAnalyticsProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    defaultPlatforms
  );
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "90d">(defaultDateRange);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [stackBars, setStackBars] = useState(true);

  const days = useMemo(() => {
    switch (dateRange) {
      case "7d":
        return 7;
      case "14d":
        return 14;
      case "30d":
        return 30;
      case "90d":
        return 90;
    }
  }, [dateRange]);

  const chartData = useMemo(() => generateSentimentSeries(days, selectedPlatforms), [
    days,
    selectedPlatforms,
  ]);

  const totals = useMemo(() => sentimentTotals(chartData), [chartData]);

  const filteredHashtags = useMemo(() => {
    // Simple relevance by platform count and keyword overlap
    const mult = Math.max(1, selectedPlatforms.length);
    const boosted = MOCK_HASHTAGS.map((h, i) => {
      const base = h.frequency;
      const hasKey = keywords.some((k) =>
        h.tag.toLowerCase().includes(k.toLowerCase())
      )
        ? 1.15
        : 1;
      return { ...h, frequency: Math.round(base * mult * hasKey + randomIn(0, 20, i)) };
    });
    const max = Math.max(...boosted.map((b) => b.frequency));
    return boosted.map((b) => ({
      ...b,
      pct: max ? Math.round((b.frequency / max) * 100) : 0,
    }));
  }, [selectedPlatforms, keywords]);

  const filteredPosts = useMemo(() => {
    const platformFiltered = MOCK_POSTS.filter((p) =>
      selectedPlatforms.includes(p.platform)
    );
    if (keywords.length === 0) return platformFiltered.slice(0, 6);
    return platformFiltered
      .filter((p) =>
        keywords.some((k) => p.content.toLowerCase().includes(k.toLowerCase()))
      )
      .slice(0, 6);
  }, [selectedPlatforms, keywords]);

  const togglePlatform = useCallback(
    (p: Platform) => {
      setSelectedPlatforms((prev) => {
        const exists = prev.includes(p);
        const next = exists ? prev.filter((x) => x !== p) : [...prev, p];
        return next.length === 0 ? prev : next; // prevent empty selection
      });
    },
    [setSelectedPlatforms]
  );

  const handleAddKeyword = useCallback(() => {
    const k = newKeyword.trim();
    if (!k) {
      toast.error("Enter a keyword to add.");
      return;
    }
    if (keywords.some((kw) => kw.toLowerCase() === k.toLowerCase())) {
      toast.message("Keyword already added.");
      return;
    }
    const next = [...keywords, k];
    setKeywords(next);
    setNewKeyword("");
    onKeywordsChange?.(next);
    toast.success(`Added keyword: ${k}`);
  }, [newKeyword, keywords, onKeywordsChange]);

  const handleRemoveKeyword = useCallback(
    (k: string) => {
      const next = keywords.filter((kw) => kw !== k);
      setKeywords(next);
      onKeywordsChange?.(next);
      toast.success(`Removed keyword: ${k}`);
    },
    [keywords, onKeywordsChange]
  );

  return (
    <section
      className={cn(
        "w-full max-w-full bg-card text-card-foreground rounded-lg border border-border shadow-sm",
        className
      )}
      aria-label="Social Media Analytics"
    >
      <div className="w-full p-4 sm:p-6">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
                Social Media Analytics
              </h2>
              <p className="text-sm text-muted-foreground">
                Sentiment, trends, and hazard classifications across platforms
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-md bg-secondary/60 p-1">
                {(["twitter", "youtube", "facebook"] as Platform[]).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={selectedPlatforms.includes(p) ? "default" : "ghost"}
                    className={cn(
                      "h-9 px-3 text-sm transition-colors",
                      selectedPlatforms.includes(p)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    )}
                    aria-pressed={selectedPlatforms.includes(p)}
                    onClick={() => togglePlatform(p)}
                  >
                    <span
                      className={cn(
                        "mr-2 h-2 w-2 rounded-full",
                        p === "twitter" && "bg-[#1DA1F2]",
                        p === "youtube" && "bg-[#FF0000]",
                        p === "facebook" && "bg-[#1877F2]"
                      )}
                    />
                    {PLATFORM_LABEL[p]}
                  </Button>
                ))}
              </div>
              <Separator orientation="vertical" className="hidden md:block h-6" />
              <Select
                value={dateRange}
                onValueChange={(v: "7d" | "14d" | "30d" | "90d") => setDateRange(v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="14d">Last 14 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Tabs
                value={chartType}
                onValueChange={(v) => setChartType(v as "line" | "bar")}
                className="ml-auto"
              >
                <TabsList>
                  <TabsTrigger value="line" aria-label="Line chart">
                    <ChartLine className="h-4 w-4 mr-2" />
                    Line
                  </TabsTrigger>
                  <TabsTrigger value="bar" aria-label="Bar chart">
                    <ChartBar className="h-4 w-4 mr-2" />
                    Bar
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-secondary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Positive</p>
                    <p className="text-xl font-semibold">
                      {totals.positive.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[color:var(--chart-2)]" />
                </div>
                <div
                  className="mt-3 h-1.5 rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (totals.positive / Math.max(1, totals.positive + totals.neutral + totals.negative)) * 100)}%`,
                      background: "var(--chart-2)",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Neutral</p>
                    <p className="text-xl font-semibold">
                      {totals.neutral.toLocaleString()}
                    </p>
                  </div>
                  <ChartPie className="h-5 w-5 text-[color:var(--chart-3)]" />
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (totals.neutral / Math.max(1, totals.positive + totals.neutral + totals.negative)) * 100)}%`,
                      background: "var(--chart-3)",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Negative</p>
                    <p className="text-xl font-semibold">
                      {totals.negative.toLocaleString()}
                    </p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-destructive"
                    style={{
                      width: `${Math.min(100, (totals.negative / Math.max(1, totals.positive + totals.neutral + totals.negative)) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart area */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">
                  Sentiment Trends
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Daily counts across selected platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {chartType === "line" ? (
                  <div className="h-[260px] sm:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <ReTooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: "var(--muted-foreground)" }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="positive"
                          stroke={seriesColors.positive}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          name="Positive"
                        />
                        <Line
                          type="monotone"
                          dataKey="neutral"
                          stroke={seriesColors.neutral}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          name="Neutral"
                        />
                        <Line
                          type="monotone"
                          dataKey="negative"
                          stroke={seriesColors.negative}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          name="Negative"
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[260px] sm:h-[320px]">
                    <div className="flex items-center justify-end pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Stack</span>
                        <Switch
                          checked={stackBars}
                          onCheckedChange={setStackBars}
                          aria-label="Toggle stack bars"
                        />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <ReTooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: "var(--muted-foreground)" }}
                        />
                        <Legend />
                        <Bar
                          dataKey="positive"
                          stackId={stackBars ? "a" : undefined}
                          fill={seriesColors.positive}
                          name="Positive"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="neutral"
                          stackId={stackBars ? "a" : undefined}
                          fill={seriesColors.neutral}
                          name="Neutral"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="negative"
                          stackId={stackBars ? "a" : undefined}
                          fill={seriesColors.negative}
                          name="Negative"
                          radius={[4, 4, 0, 0]}
                        />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {selectedPlatforms.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs",
                        platformColors[p]
                      )}
                    >
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {PLATFORM_LABEL[p]}
                    </span>
                  ))}
                  <div className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <ChartBarBig className="h-4 w-4" />
                    Data is mock for demo purposes
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trending panel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">
                  Trending Hashtags
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Frequency across selected sources
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {filteredHashtags.slice(0, 8).map((h) => (
                    <div key={h.tag} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{h.tag}</p>
                          <span className="text-xs text-muted-foreground">
                            {h.frequency.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${h.pct}%`,
                              background:
                                "linear-gradient(90deg, var(--chart-1), var(--chart-4))",
                            }}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={h.pct}
                            role="progressbar"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => {
                          const clean = h.tag.replace(/^#/, "");
                          if (!keywords.includes(clean)) {
                            const next = [...keywords, clean];
                            setKeywords(next);
                            onKeywordsChange?.(next);
                            toast.success(`Added keyword: ${clean}`);
                          } else {
                            toast.message("Keyword already added.");
                          }
                        }}
                        aria-label={`Add ${h.tag} as keyword`}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Keyword management and hazard list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Keyword tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Keyword Management</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Track specific keywords to refine detection
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add keyword (e.g., rip current)"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    aria-label="New keyword"
                  />
                  <Button onClick={handleAddKeyword}>Add</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No keywords added.
                    </p>
                  ) : (
                    keywords.map((k) => (
                      <Badge
                        key={k}
                        variant="secondary"
                        className="group pr-0 pl-2"
                      >
                        <span className="truncate max-w-[140px]">{k}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-6 px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveKeyword(k)}
                          aria-label={`Remove ${k}`}
                          title="Remove keyword"
                        >
                          ×
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hazard classifications */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      Hazard Classification
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Auto-detected posts indicating potential ocean hazards
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {filteredPosts.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No detected hazards for the current filters.
                      </p>
                    </div>
                  ) : (
                    filteredPosts.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-card/50 p-3 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 h-2 w-2 rounded-full",
                              p.platform === "twitter" && "bg-[#1DA1F2]",
                              p.platform === "youtube" && "bg-[#FF0000]",
                              p.platform === "facebook" && "bg-[#1877F2]"
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{p.type}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.timestamp}
                              </span>
                              {p.location && (
                                <span className="text-xs text-muted-foreground">
                                  • {p.location}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm leading-snug break-words">
                              {p.content}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  p.sentiment === "positive" && "text-[color:var(--chart-2)]",
                                  p.sentiment === "neutral" && "text-[color:var(--chart-3)]",
                                  p.sentiment === "negative" && "text-destructive"
                                )}
                              >
                                {p.sentiment.charAt(0).toUpperCase() +
                                  p.sentiment.slice(1)}
                              </Badge>
                              <Badge variant="outline">
                                Confidence {Math.round(p.confidence * 100)}%
                              </Badge>
                              <span
                                className={cn(
                                  "ml-auto text-xs",
                                  platformColors[p.platform]
                                )}
                              >
                                {PLATFORM_LABEL[p.platform]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}