"use client";

import { CircleHelp, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface HomeIntroProps {
  title: string;
  summary: string;
  descriptionParagraphs: string[];
  openMapLabel: string;
  infoClosedLabel: string;
  infoOpenLabel: string;
}

export const HomeIntro = ({
  title,
  summary,
  descriptionParagraphs,
  openMapLabel,
  infoClosedLabel,
  infoOpenLabel,
}: HomeIntroProps) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoButtonLabel = isInfoOpen ? infoOpenLabel : infoClosedLabel;
  const actionClassName =
    "inline-flex items-center gap-2 rounded-full border border-white/55 bg-[linear-gradient(118deg,rgba(22,101,52,0.18)_0%,rgba(15,118,110,0.14)_46%,rgba(37,99,235,0.2)_100%)] px-4 py-2 text-sm font-medium text-foreground shadow-[0_12px_28px_rgba(148,163,184,0.2)] backdrop-blur-md transition-colors hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.24)_0%,rgba(15,118,110,0.22)_46%,rgba(37,99,235,0.28)_100%)] dark:shadow-[0_18px_34px_rgba(2,6,23,0.34)]";

  return (
    <section className="w-full" aria-labelledby="home-intro-title">
      <h1 id="home-intro-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">{summary}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsInfoOpen((current) => !current)}
          className={actionClassName}
          aria-expanded={isInfoOpen}
          aria-controls="home-intro-description"
        >
          <CircleHelp className="h-4 w-4 text-primary" aria-hidden="true" />
          {infoButtonLabel}
        </button>
        <Link
          href="/parks"
          className={actionClassName}
        >
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          {openMapLabel}
        </Link>
      </div>

      <div
        id="home-intro-description"
        aria-hidden={!isInfoOpen}
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none ${
          isInfoOpen ? "mt-4" : "mt-0"
        }`}
        style={{
          gridTemplateRows: isInfoOpen ? "1fr" : "0fr",
          opacity: isInfoOpen ? 1 : 0,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 rounded-[2rem] border border-white/50 bg-white/60 px-5 py-4 text-muted-foreground shadow-[0_20px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/44 dark:shadow-[0_24px_48px_rgba(2,6,23,0.28)]">
            {descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
