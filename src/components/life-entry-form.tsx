"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type EntryKind = "APPOINTMENT" | "TRIP" | "LEARNING_GOAL" | "MEMORY" | "FINANCIAL_GOAL" | "GENERAL";

const categoryByKind: Record<EntryKind, string> = { APPOINTMENT: "HEALTH", TRIP: "TRAVEL", LEARNING_GOAL: "EDUCATION", MEMORY: "GENERAL", FINANCIAL_GOAL: "FINANCE", GENERAL: "GENERAL" };

export function LifeEntryForm({ kind, dateLabel = "Date", descriptionLabel = "Notes", submitLabel = "Save" }: { kind: EntryKind; dateLabel?: string; descriptionLabel?: string; submitLabel?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
  async function submit(formData: FormData) {
    setMessage("Saving…");
    const response = await fetch("/api/life-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: categoryByKind[kind], kind, title: formData.get("title"), description: formData.get("description") || undefined, occurredAt: formData.get("occurredAt"), metadata: {} }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Could not save this entry.");
    setMessage("Saved to your private timeline.");
    router.refresh();
  }
  return <form action={submit} className="grid gap-4 rounded-xl border bg-card p-6"><label className="text-sm">Title<input name="title" maxLength={200} required className={input} /></label><label className="text-sm">{dateLabel}<input name="occurredAt" type={kind === "APPOINTMENT" ? "datetime-local" : "date"} required className={input} /></label><label className="text-sm">{descriptionLabel}<textarea name="description" rows={4} maxLength={5000} className={input} /></label><Button type="submit">{submitLabel}</Button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}</form>;
}
