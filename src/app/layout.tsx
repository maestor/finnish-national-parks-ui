import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { HomeMapControlsProvider } from "@/components/providers/home-map-controls-provider";
import { SerwistProvider } from "@/components/providers/serwist-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { siteEnv } from "@/lib/env";
import messages from "../../messages/fi.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const toMetadataBase = (value: string): URL => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value);
  }

  return new URL(`https://${value}`);
};

const resolveMetadataBase = (): URL => {
  const configuredBase =
    siteEnv.NEXT_PUBLIC_SITE_URL ?? siteEnv.VERCEL_PROJECT_PRODUCTION_URL ?? siteEnv.VERCEL_URL;

  return configuredBase ? toMetadataBase(configuredBase) : new URL("http://localhost:4300");
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("metadata");

  return {
    metadataBase: resolveMetadataBase(),
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
    applicationName: t("title"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: t("title"),
      type: "website",
      locale: "fi_FI",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("title"),
    },
    icons: {
      icon: [{ url: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
      shortcut: ["/favicon.svg"],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    formatDetection: {
      telephone: false,
    },
  };
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(142 76% 36%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(142 71% 45%)" },
  ],
  width: "device-width",
  initialScale: 1,
};

const locale = "fi";
const shouldDisableSerwistInProduction = process.env.NODE_ENV === "production";

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SerwistProvider swUrl="/serwist/sw.js" disable={shouldDisableSerwistInProduction}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Suspense>
                <HomeMapControlsProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <Header />
                    <main className="flex flex-1 flex-col">{children}</main>
                  </div>
                </HomeMapControlsProvider>
              </Suspense>
            </ThemeProvider>
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
