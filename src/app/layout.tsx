import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { publicEnvironment } from "@/lib/env/public";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
export const metadata: Metadata = { title: "LifeOS", description: "Privacy-first, source-linked personal records." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = <html lang="en"><body className={`${geist.className} antialiased`}>{children}</body></html>;
  return publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider publishableKey={publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>{content}</ClerkProvider> : content;
}
