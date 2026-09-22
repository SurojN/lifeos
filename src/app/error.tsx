"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return <main className="mx-auto grid min-h-[60vh] max-w-xl content-center gap-5 px-6 py-16">
    <p className="eyebrow">LIFEOS</p>
    <h1 className="text-3xl font-medium tracking-tight">This page could not be loaded</h1>
    <p className="text-sm leading-6 text-muted-foreground">LifeOS couldn’t retrieve the information needed for this page. Try again, or return home and sign in again if your session has expired.</p>
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={() => startTransition(() => { router.refresh(); reset(); })}>Try again</Button>
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">Return home</Link>
    </div>
  </main>;
}
