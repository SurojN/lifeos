import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const links = [["/dashboard", "Overview"], ["/documents", "Documents"], ["/medical", "Medical timeline"], ["/timeline", "Life timeline"], ["/settings/privacy", "Privacy"]] as const;

export function ApplicationShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/40"><header className="border-b bg-background"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/dashboard" className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary" />LifeOS</Link><span className="text-xs text-muted-foreground">Early production foundation</span></div></header><div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[220px_1fr]"><nav className="flex flex-col gap-1" aria-label="Application">{links.map(([href, label]) => <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-background hover:text-foreground">{label}</Link>)}</nav><main>{children}</main></div></div>;
}
