import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { publicEnvironment } from "@/lib/env/public";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: { default: "LifeOS", template: "%s · LifeOS" },
  description: "Privacy-first, source-linked personal records.",
  applicationName: "LifeOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LifeOS" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <ClerkProvider publishableKey={publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} dynamic signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/" appearance={{ variables: { colorPrimary: "#087443", borderRadius: "14px", colorBackground: "#fffefb", fontFamily: "var(--font-geist-sans), sans-serif" }, elements: { cardBox: "shadow-[0_20px_60px_rgba(21,55,39,.12)]", formButtonPrimary: "shadow-lg shadow-emerald-900/10 hover:shadow-xl" } }}>{children}</ClerkProvider>
    : children;
  return <html lang="en"><body className={`${geist.className} antialiased`}>{content}<ServiceWorkerRegistration /></body></html>;
}
