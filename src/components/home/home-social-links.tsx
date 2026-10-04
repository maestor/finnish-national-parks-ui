import { AppImage } from "@/components/ui/app-image";
import { cn } from "@/lib/cn";

interface HomeSocialLinksProps {
  sectionLabel: string;
  title: string;
  linkedInLabel: string;
  linkedInText: string;
  githubUiLabel: string;
  githubUiText: string;
  githubApiLabel: string;
  githubApiText: string;
  copyrightLabel: string;
}

export const HomeSocialLinks = ({
  sectionLabel,
  title,
  linkedInLabel,
  linkedInText,
  githubUiLabel,
  githubUiText,
  githubApiLabel,
  githubApiText,
  copyrightLabel,
}: HomeSocialLinksProps) => {
  const socialLinks = [
    {
      href: "https://www.linkedin.com/in/khaavisto/",
      label: linkedInLabel,
      text: linkedInText,
      lightIconSrc: "/social/linkedin-inbug-black.png",
      darkIconSrc: "/social/linkedin-inbug-white.png",
      iconWidth: 24,
      iconHeight: 24,
    },
    {
      href: "https://github.com/maestor/finnish-national-parks-ui/",
      label: githubUiLabel,
      text: githubUiText,
      lightIconSrc: "/social/github-invertocat-black.svg",
      darkIconSrc: "/social/github-invertocat-white.svg",
      iconWidth: 24,
      iconHeight: 24,
    },
    {
      href: "https://github.com/maestor/finnish-national-parks-api",
      label: githubApiLabel,
      text: githubApiText,
      lightIconSrc: "/social/github-invertocat-black.svg",
      darkIconSrc: "/social/github-invertocat-white.svg",
      iconWidth: 24,
      iconHeight: 24,
    },
  ] as const;

  return (
    <section aria-label={sectionLabel} className="border-t border-border pt-4 text-left">
      <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {title}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 max-[374px]:gap-2">
        {socialLinks.map(
          ({ href, label, text, lightIconSrc, darkIconSrc, iconWidth, iconHeight }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className={cn(
                "inline-flex min-h-12 items-center gap-3 rounded-full border border-border bg-control px-4 py-2.5 text-foreground shadow-[0_12px_24px_rgba(var(--shadow-rgb),0.12)] transition-transform hover:-translate-y-0.5 hover:border-border hover:bg-accent hover:shadow-[0_14px_28px_rgba(var(--shadow-rgb),0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[374px]:gap-2 max-[374px]:px-2.5 motion-reduce:transform-none dark:shadow-[0_16px_32px_rgba(var(--shadow-rgb),0.28)]",
              )}
            >
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <AppImage
                  src={lightIconSrc}
                  alt=""
                  aria-hidden="true"
                  width={iconWidth}
                  height={iconHeight}
                  unoptimized
                  className="h-5 w-5 object-contain dark:hidden"
                />
                <AppImage
                  src={darkIconSrc}
                  alt=""
                  aria-hidden="true"
                  width={iconWidth}
                  height={iconHeight}
                  unoptimized
                  className="hidden h-5 w-5 object-contain dark:block"
                />
              </span>
              <span className="text-sm font-semibold tracking-[0.08em]">{text}</span>
            </a>
          ),
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{copyrightLabel}</p>
    </section>
  );
};
