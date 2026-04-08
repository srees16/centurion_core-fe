"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /ind-stocks/paper-trade redirects to the Trade Monitor page
 * with the Paper Validation tab pre-selected via query param.
 */
export default function PaperTradePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ind-stocks/trade-monitor?tab=paper");
  }, [router]);
  return null;
}
