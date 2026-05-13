import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fi.json";

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider = ({ children }: I18nProviderProps) => {
  return (
    <NextIntlClientProvider locale="fi" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
};
