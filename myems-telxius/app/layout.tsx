import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telxius EMS | Datacenter Energy Management",
  description: "Advanced infrastructure management for MyemsTelxius. Physical BDFB monitoring, real-time telemetry and capacity planning.",
};

import { MqttProvider } from "../lib/MqttContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-500">
        <MqttProvider>
          {children}
        </MqttProvider>
      </body>
    </html>
  );
}
