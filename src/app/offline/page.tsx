import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function OfflinePage() {
  return <main className="grid min-h-screen place-items-center px-6"><section className="w-full max-w-md rounded-[2rem] border bg-white/75 p-8 text-center shadow-xl shadow-emerald-950/5 backdrop-blur"><div className="mx-auto flex w-fit items-center gap-3"><BrandMark/><span className="font-semibold">LifeOS</span></div><span className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-primary"><CloudOff className="size-6"/></span><h1 className="mt-5 text-2xl font-medium tracking-tight">You’re offline</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">For your privacy, personal records are not stored in the offline cache. Reconnect to securely open your workspace.</p><Link href="/dashboard" className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white"><RefreshCw className="size-4"/>Try again</Link></section></main>;
}
