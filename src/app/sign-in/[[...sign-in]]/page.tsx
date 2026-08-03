import { SignIn } from "@clerk/nextjs";
import { publicEnvironment } from "@/lib/env/public";

export const dynamic = "force-dynamic";
export default function SignInPage() { return <main className="grid min-h-screen place-items-center p-6">{publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <SignIn /> : <div className="max-w-md rounded-xl border bg-card p-6"><h1 className="text-xl font-semibold">Authentication is not configured</h1><p className="mt-2 text-sm text-muted-foreground">Add the Clerk environment variables described in the development setup before signing in.</p></div>}</main>; }
