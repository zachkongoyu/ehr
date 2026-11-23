import Link from "next/link";
import type { ReactNode } from "react";
import { Search, Cross } from "lucide-react";
import { ClinicNav } from "@/components/clinic-nav";
import { DemoGuide } from "@/components/demo-guide";
import { setLocale } from "@/app/actions";
import type { Locale } from "@/lib/locale-shared";

export function ClinicShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div className="clinic-app">
      <a href="#main" className="skip-link">
        {locale === "en" ? "Skip to content" : "跳至內容"}
      </a>
      <header className="clinic-masthead">
        <div className="masthead-inner">
          <Link href="/dashboard" className="desk-wordmark">
            <Cross size={18} aria-hidden="true" />
            {locale === "en" ? "Clinic" : "診所"}
          </Link>
          <ClinicNav locale={locale} />
          <div className="language-switch" aria-label="Language">
            <form action={setLocale.bind(null, "zh-HK")}>
              <button
                className={locale === "zh-HK" ? "selected" : ""}
                lang="zh-HK"
              >
                繁中
              </button>
            </form>
            <form action={setLocale.bind(null, "en")}>
              <button className={locale === "en" ? "selected" : ""} lang="en">
                EN
              </button>
            </form>
          </div>
          <form action="/patients" className="global-search">
            <Search size={16} aria-hidden="true" />
            <input name="q" aria-label={locale === "en" ? "Find a patient" : "尋找病人"}
              placeholder={locale === "en" ? "Find patient" : "尋找病人"} />
          </form>
        </div>
      </header>
      <div className="app-content">
        <main id="main" className="workspace">
          {children}
          <DemoGuide locale={locale} />
        </main>
      </div>
    </div>
  );
}
