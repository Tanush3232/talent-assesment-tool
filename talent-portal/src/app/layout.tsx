import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: {
    template: "%s | Talent Assessment Portal",
    default: "Talent Assessment Portal",
  },
  description:
    "Internal Talent Assessment Portal for structured potential calibration across the Adventz Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", outfit.variable)}>
      <body className={`${outfit.variable} font-sans antialiased bg-slate-50`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  "bg-white border border-slate-200 text-slate-900 shadow-lg rounded-xl text-xs font-medium",
                success:
                  "border-zuari-green/30 text-zuari-green/90",
                error:
                  "border-zuari-red/30 text-zuari-red/90",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
