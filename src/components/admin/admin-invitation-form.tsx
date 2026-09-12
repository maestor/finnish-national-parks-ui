"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { type AdminInvitationResponse, createAdminInvitation } from "@/lib/admin-invitations";
import { ApiError } from "@/lib/api";

export const AdminInvitationForm = () => {
  const t = useTranslations("controlPanel.adminUsers");
  const [email, setEmail] = useState("");
  const [invitation, setInvitation] = useState<AdminInvitationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInvitation(null);
    setIsSubmitting(true);

    try {
      setInvitation(await createAdminInvitation({ email }));
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(
          caughtError.status === 409
            ? t("errors.alreadyEnrolled")
            : caughtError.status === 400
              ? t("errors.invalidEmail")
              : caughtError.status === 401 || caughtError.status === 403
                ? t("errors.notAllowed")
                : t("errors.generic"),
        );
      } else {
        setError(t("errors.generic"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = error !== null;
  const hasInvitation = invitation !== null;

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <form
        className="space-y-4 rounded-3xl border border-white/45 bg-white/70 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_52px_rgba(2,6,23,0.28)]"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="space-y-2">
          <label htmlFor="admin-invitation-email" className="text-sm font-medium">
            {t("emailLabel")}
          </label>
          <input
            id="admin-invitation-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex min-h-10 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          />
          <p className="text-sm leading-6 text-muted-foreground">{t("emailHint")}</p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? t("creating") : t("create")}
        </button>
        {hasError && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {hasInvitation && (
        <section
          aria-labelledby="admin-invitation-created"
          className="space-y-4 rounded-3xl border border-emerald-600/20 bg-emerald-50/70 p-5 shadow-[0_18px_40px_rgba(16,185,129,0.12)] dark:border-emerald-400/20 dark:bg-emerald-950/20"
        >
          <h2 id="admin-invitation-created" className="text-lg font-semibold">
            {t("createdTitle")}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("createdDescription")}</p>
          <div className="space-y-2">
            <label htmlFor="admin-invitation-link" className="text-sm font-medium">
              {t("linkLabel")}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="admin-invitation-link"
                type="url"
                readOnly
                value={invitation.invitationUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              />
              <CopyLinkButton
                href={invitation.invitationUrl}
                label={t("copyLink")}
                copiedLabel={t("linkCopied")}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/45 bg-white/78 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:hover:bg-slate-950/74"
                iconClassName="h-4 w-4"
              />
            </div>
          </div>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {t("expiresAt", {
              date: new Intl.DateTimeFormat("fi-FI", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Helsinki",
              }).format(new Date(invitation.expiresAt)),
            })}
          </p>
        </section>
      )}
    </div>
  );
};
