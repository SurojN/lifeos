import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section><Badge>{eyebrow}</Badge><h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{description}</p><Card className="mt-8"><CardHeader><CardTitle>Foundation only</CardTitle><CardDescription>This area is intentionally inactive until its privacy, authorization, and verification workflow is complete.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">No AI-generated insights, medical interpretation, or external integrations are enabled.</CardContent></Card></section>;
}
