import { ApplicationShell } from "@/components/application-shell";
import { requireInternalUser } from "@/lib/auth/adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { await requireInternalUser(); return <ApplicationShell>{children}</ApplicationShell>; }
