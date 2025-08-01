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
}

export default function EnhancedClientMap({ raw, mqtt_nodes, center }: EnhancedClientMapProps) {
  const { theme } = useTheme();
  const [externalGhostState, setExternalGhostState] = useState(false);

  // Move the dynamic import to this client component
  const Map = useMemo(() => dynamic(() => import('@components/map/basic'), {
    loading: () => <MatrixLoader />,
    ssr: false
  }), []);

  const handleGhostToggle = (showGhosts: boolean) => {
    setExternalGhostState(showGhosts);
  };

  return (
    <GhostToggleWrapper onGhostToggle={handleGhostToggle}>
      <Map 
        raw={raw} 
        live_nodes={mqtt_nodes} 
        center={center} 
        theme={theme || 'dark'}
        externalGhostState={externalGhostState}
      />
    </GhostToggleWrapper>
  );
}