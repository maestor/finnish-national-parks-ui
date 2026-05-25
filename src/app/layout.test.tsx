import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout, { generateMetadata, viewport } from "./layout";

const {
  getTranslationsMock,
  intlProviderPropsMock,
  serwistProviderPropsMock,
  themeProviderPropsMock,
} = vi.hoisted(() => ({
  getTranslationsMock: vi.fn(),
  intlProviderPropsMock: vi.fn(),
  serwistProviderPropsMock: vi.fn(),
  themeProviderPropsMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({
    children,
    locale,
    messages,
  }: {
    children: ReactNode;
    locale: string;
    messages: Record<string, unknown>;
  }) => {
    intlProviderPropsMock({ locale, messages });
    return <div data-testid="intl-provider">{children}</div>;
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

vi.mock("@/components/layout/header", () => ({
  Header: () => <header data-testid="app-header">header</header>,
}));

vi.mock("@/components/providers/home-map-controls-provider", () => ({
  HomeMapControlsProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="home-map-controls-provider">{children}</div>
  ),
}));

vi.mock("@/components/providers/serwist-provider", () => ({
  SerwistProvider: ({
    children,
    swUrl,
    disable,
  }: {
    children: ReactNode;
    swUrl: string;
    disable?: boolean;
  }) => {
    serwistProviderPropsMock({ swUrl, disable });
    return <div data-testid="serwist-provider">{children}</div>;
  },
}));

vi.mock("@/components/providers/theme-provider", () => ({
  ThemeProvider: ({
    children,
    ...props
  }: {
    children: ReactNode;
    attribute: string;
    defaultTheme: string;
    enableSystem: boolean;
    disableTransitionOnChange: boolean;
  }) => {
    themeProviderPropsMock(props);
    return <div data-testid="theme-provider">{children}</div>;
  },
}));

vi.mock("@/lib/env", () => ({
  siteEnv: {
    NEXT_PUBLIC_SITE_URL: "https://reissuvihko.example.com",
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

describe("RootLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTranslationsMock.mockResolvedValue((key: string) => `metadata.${key}`);
  });

  it("renders the global app shell around page content", async () => {
    const layout = (await RootLayout({
      children: <div data-testid="page-content">page</div>,
    })) as ReactElement<{
      children: ReactElement<{
        className: string;
        children: ReactNode;
      }>;
      lang: string;
      suppressHydrationWarning: boolean;
    }>;

    expect(layout.type).toBe("html");
    expect(layout.props.lang).toBe("fi");
    expect(layout.props.suppressHydrationWarning).toBe(true);
    expect(layout.props.children.type).toBe("body");
    expect(layout.props.children.props.className).toContain("font-geist-sans");
    expect(layout.props.children.props.className).toContain("font-geist-mono");

    render(layout.props.children.props.children);

    expect(screen.getByTestId("intl-provider")).toBeInTheDocument();
    expect(screen.getByTestId("serwist-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("home-map-controls-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("page");
    expect(screen.getByTestId("page-content")).toBeInTheDocument();

    expect(intlProviderPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fi",
      }),
    );
    expect(serwistProviderPropsMock).toHaveBeenCalledWith({
      swUrl: "/serwist/sw.js",
      disable: false,
    });
    expect(themeProviderPropsMock).toHaveBeenCalledWith({
      attribute: "class",
      defaultTheme: "system",
      disableTransitionOnChange: true,
      enableSystem: true,
    });
  });

  it("builds translated metadata for the app shell", async () => {
    const metadata = await generateMetadata();

    expect(metadata).toEqual({
      title: {
        default: "metadata.title",
        template: "%s | metadata.title",
      },
      description: "metadata.description",
      applicationName: "metadata.title",
      metadataBase: new URL("https://reissuvihko.example.com"),
      openGraph: {
        title: "metadata.title",
        description: "metadata.description",
        siteName: "metadata.title",
        type: "website",
        locale: "fi_FI",
      },
      twitter: {
        card: "summary_large_image",
        title: "metadata.title",
        description: "metadata.description",
      },
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "metadata.title",
      },
      icons: {
        icon: [{ url: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
        shortcut: ["/favicon.svg"],
        apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      },
      formatDetection: {
        telephone: false,
      },
    });
    expect(getTranslationsMock).toHaveBeenCalledWith("metadata");
  });

  it("exports the themed viewport colors for light and dark mode", () => {
    expect(viewport).toEqual({
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: "hsl(142 76% 36%)" },
        { media: "(prefers-color-scheme: dark)", color: "hsl(142 71% 45%)" },
      ],
      width: "device-width",
      initialScale: 1,
    });
  });
});
