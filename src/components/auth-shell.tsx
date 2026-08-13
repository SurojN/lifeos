import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark, LifeOrbit } from "@/components/brand-mark";

export function AuthShell({ children }: { children: ReactNode }) {
  return <main className="relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-[0.9fr_1.1fr]"><section className="relative hidden overflow-hidden border-r border-white/10 bg-ink p-10 text-white lg:flex lg:flex-col"><Link href="/" className="relative z-10 flex items-center gap-3 text-sm font-semibold"><BrandMark className="brand-mark--light"/>LifeOS</Link><div className="relative z-10 my-auto max-w-md"><p className="eyebrow text-emerald-200">YOUR LIFE, WITH CONTEXT</p><h1 className="mt-5 text-5xl font-medium leading-[1.05] tracking-[-0.05em]">Keep the details.<br/>See the whole.</h1><p className="mt-6 max-w-sm text-base leading-7 text-white/60">A private place for records, plans, goals, and the moments you want to remember.</p></div><LifeOrbit className="absolute -bottom-36 -right-40 scale-90 opacity-80"/><p className="relative z-10 text-xs text-white/40">Private · sourced · under your control</p></section><section className="relative flex min-h-screen flex-col p-6 sm:p-10"><Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>Back home</Link><div className="grid flex-1 place-items-center py-10">{children}</div></section></main>;
}
