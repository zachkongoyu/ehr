import type { ReactNode } from "react";
import "@fontsource/noto-sans-hk/latin-400.css";
import "@fontsource/noto-sans-hk/latin-700.css";
import "@fontsource/noto-sans-hk/chinese-hongkong-400.css";
import "@fontsource/noto-sans-hk/chinese-hongkong-700.css";
import { LocaleProvider } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "病人",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale === "en" ? "en-HK" : "zh-HK"}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
