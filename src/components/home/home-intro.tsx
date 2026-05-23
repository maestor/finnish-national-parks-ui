"use client";

import { ChevronDown, CircleHelp, MapPin } from "lucide-react";
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

  return (
    <section className="w-full" aria-labelledby="home-intro-title">
      <h1 id="home-intro-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-muted-foreground">{summary}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsInfoOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={isInfoOpen}
          aria-controls="home-intro-description"
        >
          <CircleHelp className="h-4 w-4 text-primary" aria-hidden="true" />
          {infoButtonLabel}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none ${isInfoOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <Link
          href="/parks"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          {openMapLabel}
        </Link>
      </div>

      <div
        id="home-intro-description"
        aria-hidden={!isInfoOpen}
        className="mt-4 grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none"
        style={{
          gridTemplateRows: isInfoOpen ? "1fr" : "0fr",
          opacity: isInfoOpen ? 1 : 0,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/30 px-5 py-4 text-muted-foreground dark:bg-muted/15">
            {descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
