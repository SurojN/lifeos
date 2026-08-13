"use client";

import { UserButton } from "@clerk/nextjs";
import { Activity, CalendarDays, FileText, GraduationCap, HeartPulse, Landmark, LockKeyhole, Map, Orbit, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const links = [
  ["/dashboard", "Overview", Orbit], ["/documents", "Documents", FileText], ["/medical", "Medical", HeartPulse], ["/finance", "Finance", Landmark], ["/travel", "Travel", Map], ["/appointments", "Appointments", CalendarDays], ["/goals", "Learning & goals", GraduationCap], ["/memories", "Memories", Sparkles], ["/timeline", "Life timeline", Activity], ["/settings/privacy", "Privacy", LockKeyhole],
] as const;

export function ApplicationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-canvas min-h-screen bg-background">
    <div className="page-atmosphere" aria-hidden="true"><span className="page-atmosphere__orb page-atmosphere__orb--one"/><span className="page-atmosphere__orb page-atmosphere__orb--two"/><span className="page-atmosphere__ring page-atmosphere__ring--one"/><span className="page-atmosphere__ring page-atmosphere__ring--two"/><span className="page-atmosphere__clover"><BrandMark/></span></div>
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-background/80 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
      <Link href="/dashboard" className="flex items-center gap-3 text-sm font-semibold"><BrandMark/>LifeOS</Link>
      <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-900 sm:flex"><span className="status-dot"/>Private workspace</span><span className="h-5 w-px bg-border"/><UserButton showName userProfileMode="modal" appearance={{ elements: { userButtonBox: "gap-2", userButtonAvatarBox: "size-8 ring-2 ring-white shadow-md", userButtonOuterIdentifier: "text-xs font-medium text-foreground" } }}/></div>
    </div></header>
    <div className="relative z-10 mx-auto grid max-w-[1440px] gap-8 px-5 py-6 sm:px-8 md:grid-cols-[216px_minmax(0,1fr)] md:py-10"><aside><nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-2 md:sticky md:top-24 md:flex-col md:overflow-visible" aria-label="Application">{links.map(([href, label, Icon]) => { const active = pathname === href; return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-ink text-white shadow-lg shadow-black/10" : "text-muted-foreground hover:bg-white hover:text-foreground")}><Icon className={cn("size-4", active ? "text-emerald-300" : "text-muted-foreground")}/>{label}</Link>; })}</nav></aside><main className="page-stage min-w-0 pb-16">{children}</main></div>
  </div>;
}
