"use client";

import React, { useCallback, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import InteractiveMapDashboard from "@/components/InteractiveMapDashboard";
import HazardReportManagement from "@/components/HazardReportManagement";
import SocialMediaAnalytics from "@/components/SocialMediaAnalytics";
import NotificationCenter from "@/components/NotificationCenter";
import SystemSettings from "@/components/SystemSettings";
import type { HazardReport as MapHazardReport } from "@/components/InteractiveMapDashboard";

type NavKey = "dashboard" | "map" | "reports" | "social" | "notifications" | "settings";

function generateMockReports(center: [number, number] = [19.0760, 72.8777], count = 180): MapHazardReport[] {
  const coastalSpots = [
    { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
    { name: "Daman", state: "Dadra & Nagar Haveli and Daman & Diu", lat: 20.3974, lng: 72.8328 },
    { name: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.8560 },
    { name: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278 },
    { name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
    { name: "Kanyakumari", state: "Tamil Nadu", lat: 8.0883, lng: 77.5385 },
    { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
    { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
    { name: "Paradip", state: "Odisha", lat: 20.3167, lng: 86.6167 },
    { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  ];
  const people = ["Amit Kumar", "Priya Singh", "Rahul Sharma", "Neha Verma", "Arjun Iyer", "Sneha Nair"];
  const types = ["cyclone", "flood", "landslide", "storm", "pollution", "oil_spill"];
  const statuses: MapHazardReport["status"][] = ["unverified", "under_review", "verified", "false_alarm"];
  const sources: MapHazardReport["source"][] = ["citizen", "sensor", "social", "official", "other"];
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  const items: MapHazardReport[] = [];
  for (let i = 0; i < count; i++) {
    const base = coastalSpots[i % coastalSpots.length]!;
    const lat = base.lat + (Math.random() - 0.5) * 0.25;
    const lng = base.lng + (Math.random() - 0.5) * 0.25;
    const type = types[i % types.length]!;
    const status = statuses[i % statuses.length]!;
    const source = sources[i % sources.length]!;
    const timestamp = new Date(now - Math.floor(Math.random() * 14) * day - Math.floor(Math.random() * day)).toISOString();
    const withMedia = i % 3 === 0;
    const mediaUrls = withMedia
      ? [
          "https://images.unsplash.com/photo-1502303756782-9a5a2d43a3d0?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1502452213786-0f4d3f5b4ca3?q=80&w=600&auto=format&fit=crop",
        ]
      : undefined;
    const personName = people[i % people.length]!;
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} near ${base.name}`;
    const locationName = `${base.name}, ${base.state}`;
    const tags = [type, base.state.toLowerCase(), "coast", source];

    items.push({
      id: `r-${i.toString().padStart(3, "0")}`,
      lat,
      lng,
      type,
      status,
      source,
      timestamp,
      description:
        i % 3 === 0
          ? "Automated detection; field confirmation pending along Indian coast."
          : i % 3 === 1
          ? "Citizen report awaiting triage by local authorities."
          : "Verified by officials; response teams notified.",
      mediaUrls,
      personName,
      title,
      locationName,
      tags,
    });
  }
  return items;
}

export default function Page() {
  const [active, setActive] = useState<NavKey>("map");
  const [collapsed, setCollapsed] = useState(false);
  const [language, setLanguage] = useState<string>("en");

  const reports = useMemo(() => generateMockReports(), []);

  const breadcrumbs = useMemo(() => {
    const map: Record<NavKey, { label: string; trail: { label: string; href?: string }[] }> = {
      dashboard: { label: "Dashboard", trail: [{ label: "Home", href: "/" }, { label: "Dashboard" }] },
      map: { label: "Map", trail: [{ label: "Home", href: "/" }, { label: "Map" }] },
      reports: { label: "Reports", trail: [{ label: "Home", href: "/" }, { label: "Reports" }] },
      social: { label: "Social Media", trail: [{ label: "Home", href: "/" }, { label: "Social Media" }] },
      notifications: { label: "Notifications", trail: [{ label: "Home", href: "/" }, { label: "Notifications" }] },
      settings: { label: "Settings", trail: [{ label: "Home", href: "/" }, { label: "Settings" }] },
    };
    return map[active].trail;
  }, [active]);

  const handleSelect = useCallback((key: string) => {
    setActive(key as NavKey);
  }, []);

  const handleLanguageChange = useCallback((code: string) => {
    setLanguage(code);
  }, []);

  return (
    <div className="flex h-dvh min-h-0 w-full bg-background text-foreground">
      <AdminSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        activeKey={active}
        onSelect={handleSelect}
        className="shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          breadcrumbs={breadcrumbs}
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
          className="sticky top-0 z-40"
        />
        <main className="flex-1 min-h-0">
          {active === "dashboard" ? (
            <div className="grid grid-rows-[auto,1fr] gap-4 p-4 sm:p-6 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <InteractiveMapDashboard
                    reports={reports}
                    className="w-full"
                    defaultCluster
                    defaultHeatmap={false}
                    showClusterToggle
                    showHeatmapToggle
                    initialCenter={[19.076, 72.8777]}
                    initialZoom={6}
                    language={language === "hi" ? "hi" : "en"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">
                <SocialMediaAnalytics />
                <NotificationCenter />
              </div>
            </div>
          ) : active === "map" ? (
            <div className="p-4 sm:p-6 h-full">
              <InteractiveMapDashboard
                reports={reports}
                className="w-full"
                defaultCluster
                defaultHeatmap={false}
                showClusterToggle
                showHeatmapToggle
                initialCenter={[19.076, 72.8777]}
                initialZoom={6}
                language={language === "hi" ? "hi" : "en"}
              />
            </div>
          ) : active === "reports" ? (
            <div className="p-4 sm:p-6">
              <HazardReportManagement />
            </div>
          ) : active === "social" ? (
            <div className="p-4 sm:p-6">
              <SocialMediaAnalytics />
            </div>
          ) : active === "notifications" ? (
            <div className="p-4 sm:p-6">
              <NotificationCenter />
            </div>
          ) : active === "settings" ? (
            <div className="p-4 sm:p-6">
              <SystemSettings />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}