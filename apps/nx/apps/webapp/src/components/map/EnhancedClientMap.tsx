"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import MatrixLoader from "./MatrixLoader";
import { GhostToggleWrapper } from "./GhostToggleWrapper";

interface EnhancedClientMapProps {
  raw: string;
  mqtt_nodes: string;
  center: [number, number];
  loadingText?: string;
  loadingIndicator?: string;
  disableGhostMode?: boolean;
  disablePopups?: boolean;
  zoom?: number;
}

export default function EnhancedClientMap({ raw, mqtt_nodes, center, loadingText, loadingIndicator, disableGhostMode, disablePopups, zoom }: EnhancedClientMapProps) {
  const { theme } = useTheme();
  const [externalGhostState, setExternalGhostState] = useState(false);

  // Move the dynamic import to this client component
  const Map = useMemo(() => dynamic(() => import('@components/map/basic'), {
    loading: () => <MatrixLoader text={loadingText} loadingIndicator={loadingIndicator} />,
    ssr: false
  }), [loadingText, loadingIndicator]);

  const handleGhostToggle = (showGhosts: boolean) => {
    setExternalGhostState(showGhosts);
  };

  const mapComponent = (
    <Map 
      raw={raw} 
      live_nodes={mqtt_nodes} 
      center={center} 
      theme={theme || 'dark'}
      externalGhostState={externalGhostState}
      disablePopups={disablePopups}
      zoom={zoom}
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