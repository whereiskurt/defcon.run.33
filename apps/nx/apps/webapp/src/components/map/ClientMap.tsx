"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import MatrixLoader from "./MatrixLoader";

interface ClientMapProps {
  raw: string;
  mqtt_nodes: string;
  center: [number, number];
}

export default function ClientMap({ raw, mqtt_nodes, center }: ClientMapProps) {


  const { theme, setTheme } = useTheme();

  // Move the dynamic import to this client component
  const Map = useMemo(() => dynamic(() => import('@components/map/basic'), {
    loading: () => <MatrixLoader />,
    ssr: false
  }), []);

  return <Map raw={raw} live_nodes={mqtt_nodes} center={center} theme={theme || 'dark'} />;
}
