import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { publicEnvironment } from "@/lib/env/public";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
export const metadata: Metadata = { title: "LifeOS", description: "Privacy-first, source-linked personal records." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <ClerkProvider publishableKey={publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} dynamic signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/" appearance={{ variables: { colorPrimary: "#087443", borderRadius: "14px", colorBackground: "#fffefb", fontFamily: "var(--font-geist-sans), sans-serif" }, elements: { cardBox: "shadow-[0_20px_60px_rgba(21,55,39,.12)]", formButtonPrimary: "shadow-lg shadow-emerald-900/10 hover:shadow-xl" } }}>{children}</ClerkProvider>
    : children;
  return <html lang="en"><body className={`${geist.className} antialiased`}>{content}</body></html>;
}
