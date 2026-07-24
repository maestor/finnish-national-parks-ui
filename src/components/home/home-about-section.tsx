import { CircleHelp } from "lucide-react";
import {
  PUBLIC_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { BackToStartLink } from "./back-to-start-link";

interface HomeAboutSectionProps {
  title: string;
  descriptionParagraphs: string[];
  backToStartLabel: string;
  children?: React.ReactNode;
}

export const HomeAboutSection = ({
  title,
  descriptionParagraphs,
  backToStartLabel,
  children,
}: HomeAboutSectionProps) => (
  <section
    id="home-about"
    aria-labelledby="home-about-title"
    className="scroll-mt-24 sm:scroll-mt-28"
  >
    <div className={PUBLIC_PANEL_CLASS_NAME}>
      <div className="flex items-center gap-3">
        <span className={PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME}>
          <CircleHelp className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <h2 id="home-about-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground sm:text-base">
        {descriptionParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-5">
        <BackToStartLink label={backToStartLabel} />
      </div>

      {!!children && <div className="mt-5">{children}</div>}
    </div>
  </section>
);
