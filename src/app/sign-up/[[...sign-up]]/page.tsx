import { SignUp } from "@clerk/nextjs";
import { publicEnvironment } from "@/lib/env/public";
import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthShell>{publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" /> : <div className="max-w-md rounded-2xl border bg-card p-6"><h1 className="text-xl font-semibold">Authentication is not configured</h1><p className="mt-2 text-sm text-muted-foreground">Connect Clerk before creating an account.</p></div>}</AuthShell>;
}
