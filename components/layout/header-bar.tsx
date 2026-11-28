"use client";

import { usePathname } from "next/navigation";

import { NseSessionBadge } from "@/components/common/nse-session-badge";
import { UserMenu } from "./user-menu";

interface HeaderBarProps {
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function HeaderBar({ subtitle, rightContent }: HeaderBarProps) {
  const indStocks = usePathname()?.startsWith("/ind-stocks") ?? false;
  return (
    <div className="header-bar">
      <div className="min-w-0 flex-1 pl-10 lg:pl-0">
        <h1 className="text-header-foreground text-base lg:text-lg font-semibold tracking-tight leading-tight m-0 truncate">
          Centurion Capital LLC
        </h1>
        {subtitle && (
          <p className="text-header-muted text-[0.72rem] tracking-wider uppercase font-medium mt-0.5 m-0">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {indStocks && <NseSessionBadge />}
        {rightContent}
        <UserMenu />
      </div>
    </div>
  );
}
