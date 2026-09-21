import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CalendarDays, Check, FileCheck2, FileHeart, Landmark, LockKeyhole, Map, MessageCircleQuestion, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark, LifeOrbit } from "@/components/brand-mark";

const areas = [
  { icon: FileHeart, label: "Health & records" },
  { icon: Landmark, label: "Money & goals" },
  { icon: CalendarDays, label: "Plans & appointments" },
  { icon: Map, label: "Travel & memories" },
];

const outcomes = [
  { icon: LockKeyhole, step: "01", title: "Keep the original", text: "Store important documents privately, with owner-controlled download and source deletion; structured history remains exportable." },
  { icon: FileCheck2, step: "02", title: "Confirm what is true", text: "Review every important field. LifeOS labels user-entered, confirmed, calculated, and AI-inferred information." },
  { icon: MessageCircleQuestion, step: "03", title: "Ask and act", text: "Find useful answers from your own history and return to the exact source before an important decision." },
] as const;

export default async function LandingPage() {
  const { isAuthenticated } = await auth();
  const primaryHref = isAuthenticated ? "/dashboard" : "/sign-up";
  const primaryLabel = isAuthenticated ? "Open LifeOS" : "Start your LifeOS";

  return <main className="relative min-h-screen overflow-hidden">
    <div className="ambient-grid absolute inset-0 -z-10"/>
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight"><BrandMark/>LifeOS</Link>
      <nav className="flex items-center gap-2" aria-label="Public navigation">
        {isAuthenticated ? <span className="hidden text-sm text-muted-foreground sm:inline">Welcome back</span> : <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/70 hover:text-foreground">Sign in</Link>}
        <Link href={primaryHref} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5">{isAuthenticated ? "Open workspace" : "Get started"}</Link>
      </nav>
    </header>

    <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
      <div className="relative z-10">
        <p className="eyebrow"><Sparkles className="size-3.5"/>PRIVATE, SOURCE-GROUNDED LIFE GUIDE</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Your records should<br/><span className="text-primary">help you act.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Bring health records, plans, goals, and important documents together. Ask your own history, see where each fact came from, and prepare the next step without giving up control.</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href={primaryHref} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xl shadow-emerald-900/15 transition hover:-translate-y-0.5">{primaryLabel}<ArrowRight className="size-4"/></Link>
          <a href="#how-it-helps" className="inline-flex h-12 items-center rounded-full border bg-white/60 px-6 text-sm font-medium backdrop-blur transition hover:bg-white">See how it helps</a>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground"><li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary"/>No ads or data selling</li><li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary"/>Important answers show sources</li><li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary"/>Export and record deletion controls</li></ul>
        <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{areas.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Icon className="size-4 text-primary"/></span>{label}</div>)}</div>
      </div>

      <div className="relative grid min-h-[430px] place-items-center lg:min-h-[600px]">
        <LifeOrbit/>
        <div className="float-card absolute left-0 top-[18%] w-52 sm:left-[4%]"><span className="status-dot"/>Grounded answer<p className="mt-2 text-base font-semibold text-foreground">Latest prescription found</p><p className="mt-1 text-xs text-muted-foreground">User confirmed · source available</p></div>
        <div className="float-card absolute bottom-[16%] right-0 w-52 sm:right-[2%]"><span className="text-xs font-medium text-muted-foreground">One useful next step</span><p className="mt-2 text-base font-semibold tracking-tight text-foreground">Prepare for appointment</p><p className="mt-2 text-xs text-muted-foreground">Review source-backed history</p></div>
      </div>
    </section>

    <section id="how-it-helps" className="relative border-y border-emerald-900/10 bg-white/55 px-5 py-20 backdrop-blur-sm sm:px-8">
      <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="eyebrow">FROM INFORMATION TO HELP</p><h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Not another place to fill in forms.</h2><p className="mt-4 leading-7 text-muted-foreground">LifeOS is designed around a useful loop: preserve evidence, confirm facts, then use them to prepare.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{outcomes.map(({ icon: Icon, step, title, text }) => <article key={step} className="rounded-2xl border bg-card p-6 shadow-[0_12px_35px_rgba(25,67,47,.05)]"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-primary"><Icon className="size-5"/></span><span className="text-xs font-semibold tracking-[.16em] text-muted-foreground">{step}</span></div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div></div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center"><div><p className="eyebrow">INTELLIGENCE WITH BOUNDARIES</p><h2 className="mt-3 max-w-3xl text-3xl font-medium tracking-tight sm:text-4xl">Powerful help should still be accountable.</h2><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">LifeOS can help find facts, prepare questions, and compare transparent scenarios. It does not silently monitor you, invent missing history, diagnose illness, or move your money.</p></div><aside className="rounded-2xl border border-emerald-900/10 bg-emerald-50/75 p-6"><ShieldCheck className="size-6 text-primary"/><p className="mt-4 font-semibold">You remain in control.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">External AI requires a clear action and consent. Important claims identify their source and confidence.</p></aside></section>

    <footer className="border-t px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><BrandMark/>LifeOS · Built for long-term trust</span><span>Decision support, not professional advice</span></div></footer>
  </main>;
}
