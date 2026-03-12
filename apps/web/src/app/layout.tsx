import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sibyl — AI-Native Incident Investigation",
  description:
    "Sibyl is an AI-native observability platform that automatically investigates incidents by correlating logs, traces, and metrics to surface root causes in seconds.",
  keywords: [
    "observability",
    "incident investigation",
    "AI",
    "logs",
    "traces",
    "metrics",
    "root cause analysis",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          {children}
          <div className="noise-overlay" aria-hidden="true" />
        </ThemeProvider>
      </body>
    </html>
  );
}
