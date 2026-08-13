import type { LucideIcon } from "lucide-react";

const tones = {
  emerald: "from-emerald-50 to-white text-emerald-800",
  blue: "from-sky-50 to-white text-sky-800",
  sand: "from-amber-50 to-white text-amber-900",
  rose: "from-rose-50 to-white text-rose-800",
  violet: "from-violet-50 to-white text-violet-800",
} as const;

export function PageHero({ eyebrow, title, description, icon: Icon, tone = "emerald", status }: { eyebrow: string; title: string; description: string; icon: LucideIcon; tone?: keyof typeof tones; status?: string }) {
  return <header className={`domain-hero relative overflow-hidden rounded-[1.6rem] border bg-gradient-to-br p-6 sm:p-8 ${tones[tone]}`}><div className="relative z-10 max-w-2xl"><div className="flex items-center gap-3"><span className="domain-hero__icon"><Icon className="size-5"/></span><p className="eyebrow text-current">{eyebrow}</p></div><h1 className="mt-5 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>{status ? <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-current/10 bg-white/60 px-3 py-1.5 text-xs font-medium text-current backdrop-blur"><span className="status-dot"/>{status}</p> : null}</div><div className="domain-hero__shape" aria-hidden="true"><span/><span/><span/></div></header>;
}
