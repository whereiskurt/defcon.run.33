"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { GhostToggleWrapper } from "./GhostToggleWrapper";
import { Spinner } from "@heroui/react";

interface EnhancedClientMapProps {
  raw: string;
  mqtt_nodes: string;
  center: [number, number];
  loadingText?: string;
  loadingIndicator?: string;
  disableGhostMode?: boolean;
  disablePopups?: boolean;
  zoom?: number;
  onMapReady?: (mapInstance: any) => void;
  themeOverride?: string;
}

export default function EnhancedClientMap({ raw, mqtt_nodes, center, loadingText, loadingIndicator, disableGhostMode, disablePopups, zoom, onMapReady, themeOverride }: EnhancedClientMapProps) {
  const { theme, resolvedTheme } = useTheme();
  const [externalGhostState, setExternalGhostState] = useState(false);
  
  // Unified theme detection: Use themeOverride if provided, otherwise use resolvedTheme for consistency
  // resolvedTheme is more reliable than theme as it resolves 'system' to actual theme
  const effectiveTheme = themeOverride || resolvedTheme || 'light';
  


  // Move the dynamic import to this client component
  const Map = useMemo(() => dynamic(() => import('@components/map/basic'), {
    loading: () => (
      <div className="h-full w-full rounded-lg bg-default-100 flex flex-col items-center justify-center gap-2">
        <Spinner size="lg" color="primary" />
        <div className="text-default-500 text-sm">{loadingText || "Loading map..."}</div>
      </div>
    ),
    ssr: false
  }), [loadingText]);

  const handleGhostToggle = (showGhosts: boolean) => {
    setExternalGhostState(showGhosts);
  };

  const mapComponent = (
    <Map 
      raw={raw} 
      live_nodes={mqtt_nodes} 
      center={center} 
      theme={effectiveTheme}
      externalGhostState={externalGhostState}
      disablePopups={disablePopups}
      zoom={zoom}
      onMapReady={onMapReady}
    />
  );

  if (disableGhostMode) {
    return mapComponent;
  }

  return (
    <GhostToggleWrapper onGhostToggle={handleGhostToggle}>
      {mapComponent}
    </GhostToggleWrapper>
  );
}