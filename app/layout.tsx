import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CreativeOS — Creative Agency Management Platform",
  description:
    "Streamline your creative workflow with an all-in-one platform for client onboarding, project management, approvals, content calendars, and team collaboration.",
  keywords: [
    "creative agency",
    "project management",
    "client onboarding",
    "approval workflow",
    "content calendar",
    "team collaboration",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("scroll-smooth", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}