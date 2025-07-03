"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

interface ClientMapProps {
  raw: string;
  center: [number, number];
}

export default function ClientMap({ raw, center }: ClientMapProps) {
  // Move the dynamic import to this client component
  const Map = useMemo(() => dynamic(() => import('@components/map/basic'), {
    loading: () => <p>A map is loading</p>,
    ssr: false
  }), []);

  return <Map raw={raw} center={center} />;
}
