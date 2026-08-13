"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

async function sha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function DocumentUploadForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setBusy(true);
    setMessage("Preparing private upload…");
    try {
      const authorization = await fetch("/api/documents/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ originalFileName: file.name, mimeType: file.type, sizeBytes: file.size, checksum: await sha256(file), category: "HEALTH" }) });
      const authorized = await authorization.json();
      if (!authorization.ok) throw new Error(authorized.error ?? "Upload authorization failed.");
      const uploaded = await fetch(authorized.uploadUrl, { method: "PUT", headers: authorized.requiredHeaders, body: file });
      if (!uploaded.ok) throw new Error("Private storage rejected the upload.");
      const confirmation = await fetch(`/api/documents/uploads/${authorized.uploadId}/confirm`, { method: "POST" });
      const confirmed = await confirmation.json();
      if (!confirmation.ok) throw new Error(confirmed.error ?? "Upload verification failed.");
      setMessage("Uploaded privately. Review the document fields in Medical next.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  return <form action={upload} className="grid gap-4 rounded-xl border bg-card p-6">
    <div><h2 className="font-semibold">Add a prescription or report</h2><p className="mt-1 text-sm text-muted-foreground">PDF, JPEG, or PNG up to 10 MB. Nothing is extracted or shared automatically.</p></div>
    <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="block w-full rounded-md border bg-background p-2 text-sm" />
    <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload privately"}</Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </form>;
}
