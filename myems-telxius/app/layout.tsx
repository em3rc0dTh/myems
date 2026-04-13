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
  title: "AppM EMS | Datacenter Energy Management",
  description: "Advanced infrastructure management for MyemsTelxius. Physical BDFB monitoring, real-time telemetry and capacity planning.",
};

import { MqttProvider } from "../lib/MqttContext";
import NavigationSidebar from "@/components/NavigationSidebar";

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
      <body suppressHydrationWarning className="min-h-full bg-background text-foreground transition-colors duration-500">
        <MqttProvider>
          <div className="flex min-h-screen">
            <NavigationSidebar />
            <div className="flex-1 lg:pl-32 flex flex-col min-w-0">
               {children}
            </div>
          </div>
        </MqttProvider>
      </body>
    </html>
  );
}
