import { PostLoginReturnRedirector } from "@/components/auth/post-login-return-redirector";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("title"),
  };
};

const ControlPanelPage = async () => {
  const t = await getTranslations("controlPanel.dashboard");

  return (
    <div className="max-w-2xl">
      <PostLoginReturnRedirector />
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
    </div>
  );
};

export default ControlPanelPage;
