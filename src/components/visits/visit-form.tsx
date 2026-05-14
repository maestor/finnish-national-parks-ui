"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import type { Park, VisitWithPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VisitFormProps {
  parks: Park[];
  visitToEdit?: VisitWithPark;
  defaultParkSlug?: string;
}

export const VisitForm = ({ parks, visitToEdit, defaultParkSlug }: VisitFormProps) => {
  const t = useTranslations("controlPanel.visits.form");
  const router = useRouter();
  const isEditing = !!visitToEdit;

  const [parkSlug, setParkSlug] = useState(visitToEdit?.parkSlug ?? defaultParkSlug ?? "");
  const [visitedOn, setVisitedOn] = useState(visitToEdit?.visitedOn ?? "");
  const [route, setRoute] = useState(visitToEdit?.route ?? "");
  const [author, setAuthor] = useState(visitToEdit?.author ?? "");
  const [note, setNote] = useState(visitToEdit?.note ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);

    const validationErrors: Record<string, string> = {};
    if (!isEditing && !parkSlug) {
      validationErrors.parkSlug = t("validation.parkRequired");
    }
    if (!visitedOn) {
      validationErrors.visitedOn = t("validation.dateRequired");
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && visitToEdit) {
        await apiFetch(`/api/me/visits/${visitToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            visitedOn,
            route: route || null,
            author: author || null,
            note: note || null,
          }),
        });
      } else {
        await apiFetch(`/api/me/parks/${parkSlug}/visits`, {
          method: "POST",
          body: JSON.stringify({
            visitedOn,
            route: route || null,
            author: author || null,
            note: note || null,
          }),
        });
      }
      router.push("/control-panel/visits");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!visitToEdit) return;
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/me/visits/${visitToEdit.id}`, { method: "DELETE" });
      router.push("/control-panel/visits");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="park" required>
          {t("parkLabel")}
        </Label>
        {isEditing ? (
          <div className={`${inputClassName} bg-muted`}>{visitToEdit?.parkName}</div>
        ) : (
          <select
            id="park"
            value={parkSlug}
            onChange={(e) => setParkSlug(e.target.value)}
            className={`${inputClassName} h-10`}
          >
            <option value="">{t("parkPlaceholder")}</option>
            {parks.map((park) => (
              <option key={park.slug} value={park.slug}>
                {park.name}
              </option>
            ))}
          </select>
        )}
        {errors.parkSlug && <p className="text-sm text-destructive">{errors.parkSlug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="visitedOn" required>
          {t("dateLabel")}
        </Label>
        <input
          id="visitedOn"
          type="date"
          lang="fi"
          value={visitedOn}
          onChange={(e) => setVisitedOn(e.target.value)}
          className={`${inputClassName} h-10`}
        />
        {errors.visitedOn && <p className="text-sm text-destructive">{errors.visitedOn}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">{t("routeLabel")}</Label>
        <input
          id="route"
          type="text"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          placeholder={t("routePlaceholder")}
          className={`${inputClassName} h-10`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">{t("authorLabel")}</Label>
        <input
          id="author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={t("authorPlaceholder")}
          className={`${inputClassName} h-10`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="note">{t("noteLabel")}</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {isPreview ? t("edit") : t("preview")}
            </button>
            <a
              href="https://www.markdownguide.org/basic-syntax/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("markdownGuide")}
            </a>
          </div>
        </div>
        {isPreview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none min-h-[120px] rounded-md border border-input bg-background px-3 py-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note || "_"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={5}
            className={`${inputClassName} resize-y`}
          />
        )}
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "..." : t("submit")}
        </Button>
        {isEditing && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {t("delete")}
          </Button>
        )}
        <Link
          href="/control-panel/visits"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
};
