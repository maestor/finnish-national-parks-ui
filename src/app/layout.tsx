import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { SerwistProvider } from "@/components/providers/serwist-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import messages from "../../messages/fi.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("metadata");

  return {
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
    applicationName: t("title"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("title"),
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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SerwistProvider swUrl="/serwist/sw.js">
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex flex-1 flex-col">{children}</main>
              </div>
            </ThemeProvider>
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
