export function attachmentDisposition(fileName: string): string {
  const safeName = fileName.toWellFormed().replace(/[\u0000-\u001f\u007f"\\/]/g, "_");
  const fallback = safeName.replace(/[^\x20-\x7e]/g, "_") || "document";
  const encoded = encodeURIComponent(safeName || "document").replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
