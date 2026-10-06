import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { HomeMapControlsProvider } from "@/components/providers/home-map-controls-provider";
import { NavigationProgress } from "@/components/providers/navigation-progress";
import { SerwistProvider } from "@/components/providers/serwist-provider";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { resolveMetadataBase } from "@/lib/site-url";
import messages from "../../messages/fi.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shouldDisableSerwist = process.env.NODE_ENV === "development";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("metadata");
  const metadataBase = resolveMetadataBase();

  return {
    metadataBase,
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
      url: metadataBase,
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
      icon: [
        { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
      shortcut: ["/icons/icon-32x32.png"],
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

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        {/* React hoists this to <head>; warms up the OSM tile connection before the map loads. */}
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <a
          href="#main-content"
          className="sr-only rounded-md bg-background font-semibold text-foreground shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
        >
          {messages.layout.skipToContent}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SerwistProvider swUrl="/serwist/sw.js" disable={shouldDisableSerwist}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SnackbarProvider>
                <Suspense>
                  <HomeMapControlsProvider>
                    <div className="relative flex min-h-screen flex-col">
                      <NavigationProgress />
                      <Header />
                      <main
                        id="main-content"
                        tabIndex={-1}
                        className="flex flex-1 scroll-mt-14 flex-col"
                      >
                        {children}
                      </main>
                    </div>
                  </HomeMapControlsProvider>
                </Suspense>
              </SnackbarProvider>
            </ThemeProvider>
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
