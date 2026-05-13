import { env } from "@/lib/env";
import { getTranslations } from "next-intl/server";

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const t = await getTranslations("auth");
  const params = await searchParams;
  const error = params.error;
  const hasError = error === "access_denied" || error === "auth_failed";

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">{t("login")}</h1>
        {hasError && (
          <p className="text-sm text-red-500" role="alert">
            {t("accessDenied")}
          </p>
        )}
        <a
          href={`${env.NEXT_PUBLIC_API_URL}/auth/google`}
          className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("loginToControlPanel")}
        </a>
      </div>
    </main>
  );
};

export default LoginPage;
