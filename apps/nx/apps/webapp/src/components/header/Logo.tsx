import React, { useEffect, useState } from "react";
import BunnyWhite from "@/public/Buny-White-Trans.svg";
import BunnyBlack from "@/public/Bunny-Black-Trans.svg";

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from "next-themes";

export function Logo() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = !mounted ? BunnyBlack : theme === "dark" ? BunnyWhite : BunnyBlack;

  return (
    <Link href="/">
      <Image alt="Bunny" priority={true} width={200} src={src} />
    </Link>
  );
}