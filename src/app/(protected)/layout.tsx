import { ApplicationShell } from "@/components/application-shell";
import { requirePageUser } from "@/lib/auth/adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <ApplicationShell>{children}</ApplicationShell>;
}
