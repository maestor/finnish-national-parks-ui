import { CircleHelp, MapPin } from "lucide-react";
import Link from "next/link";
import {
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { renderMultilineText } from "@/lib/multiline-text";
import { appRoutes } from "@/lib/routes";

interface HomeIntroProps {
  title: string;
  summary: string;
  openMapLabel: string;
  infoLabel: string;
}

export const HomeIntro = ({ title, summary, openMapLabel, infoLabel }: HomeIntroProps) => {
  const actionClassName =
    "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border theme-intro-action px-4 py-2 text-sm font-medium text-foreground shadow-[0_12px_28px_rgba(var(--shadow-rgb),0.2)] backdrop-blur-md transition-colors hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[0_18px_34px_rgba(var(--shadow-rgb),0.34)]";

  return (
    <section className="w-full px-2" aria-labelledby="home-intro-title">
      <h1 id="home-intro-title" className={PUBLIC_HERO_TITLE_CLASS_NAME}>
        {title}
      </h1>
      <p className={`mt-3 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME}`}>{renderMultilineText(summary)}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a href="#home-about" className={actionClassName}>
          <CircleHelp className="h-4 w-4 text-icon stroke-[2.25]" aria-hidden="true" />
          {infoLabel}
        </a>
        <Link href={appRoutes.parks} className={actionClassName}>
          <MapPin className="h-4 w-4 text-icon stroke-[2.25]" aria-hidden="true" />
          {openMapLabel}
        </Link>
      </div>
    </section>
  );
};
