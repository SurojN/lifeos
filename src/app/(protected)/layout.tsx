import { ApplicationShell } from "@/components/application-shell";
import { requireInternalUser } from "@/lib/auth/adapter";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  await requireInternalUser();
  return <ApplicationShell>{children}</ApplicationShell>;
}
