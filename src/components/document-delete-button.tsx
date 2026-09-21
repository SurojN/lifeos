"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DocumentDeleteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm("Delete this source document? Confirmed records remain, but the original file will no longer be available.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "The document could not be deleted.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete source"}</Button>{message && <span role="status" className="text-xs text-destructive">{message}</span>}</div>;
}
