"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { TextareaWithCounter } from "@/components/ui/textarea-with-counter";

interface MarkdownEditorProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  inputClassName: string;
  description?: string;
}

export const MarkdownEditor = ({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  inputClassName,
  description,
}: MarkdownEditorProps) => {
  const t = useTranslations("markdownEditor");
  const [isPreview, setIsPreview] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={isPreview}
            aria-controls={`${id}-content`}
            onClick={() => setIsPreview(!isPreview)}
            className="min-h-11 rounded-sm text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isPreview ? t("edit") : t("preview")}
          </button>
          <a
            href="https://www.markdownguide.org/basic-syntax/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("guide")} (${t("opensInNewTab")})`}
            className="inline-flex min-h-11 items-center rounded-sm text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("guide")}
          </a>
        </div>
      </div>
      {description !== undefined && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div id={`${id}-content`}>
        {isPreview ? (
          <section
            aria-labelledby={`${id}-label`}
            className="min-h-30 rounded-xl border border-border bg-control px-3 py-2"
          >
            {value.trim() !== "" ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-sm text-muted-foreground">{t("emptyPreview")}</p>
            )}
          </section>
        ) : (
          <TextareaWithCounter
            id={id}
            value={value}
            onValueChange={onValueChange}
            placeholder={placeholder}
            rows={5}
            className={`${inputClassName} resize-y`}
            aria-describedby={description !== undefined ? `${id}-help` : undefined}
          />
        )}
      </div>
    </div>
  );
};
