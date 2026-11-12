import Link from "next/link";
import type { ReactNode } from "react";
import { Plus, Search, Stethoscope } from "lucide-react";
import { ClinicNav } from "@/components/clinic-nav";
import { DemoGuide } from "@/components/demo-guide";
import { setLocale } from "@/app/actions";
import { clinicCopy } from "@/lib/clinic-copy";
import type { Locale } from "@/lib/locale-shared";

export function ClinicShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const c = clinicCopy(locale);
  return (
    <div className="clinic-app">
      <a href="#main" className="skip-link">
        {locale === "en" ? "Skip to content" : "跳至內容"}
      </a>
      <aside
        className="app-sidebar"
        aria-label={locale === "en" ? "Clinic sidebar" : "診所側邊欄"}
      >
        <Link
          href="/dashboard"
          className="brand"
          aria-label={locale === "en" ? "Clinic overview" : "診所總覽"}
        >
          <span className="brand-mark" aria-hidden="true">
            <Stethoscope size={23} />
          </span>
          <span>
            Clinic
            <span className="brand-caption">
              {locale === "en" ? "Demo workspace" : "示範工作台"}
            </span>
          </span>
        </Link>
        <span className="sidebar-label">
          {locale === "en" ? "WORKSPACE" : "工作台"}
        </span>
        <ClinicNav locale={locale} />
        <div className="sidebar-footer">
          <span className="sidebar-label">
            {locale === "en" ? "LANGUAGE" : "語言"}
          </span>
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
        </div>
      </aside>
      <div className="app-content">
        <header className="workspace-toolbar">
          <form action="/patients" className="global-search">
            <Search size={18} />
            <input
              name="q"
              aria-label={locale === "en" ? "Find a patient" : "尋找病人"}
              placeholder={
                locale === "en"
                  ? "Search patients, chart number or phone…"
                  : "搜尋病人、病歷編號或電話…"
              }
            />
          </form>
          <Link
            href="/patients/new"
            className="button secondary"
            aria-label={c.newPatient}
          >
            <Plus size={16} />
            {c.newPatient}
          </Link>
        </header>
        <main id="main" className="workspace">
          <DemoGuide locale={locale}/>
          {children}
        </main>
      </div>
    </div>
  );
}
