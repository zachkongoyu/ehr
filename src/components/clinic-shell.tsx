import Link from "next/link";
import type { ReactNode } from "react";
import { Users, Plus } from "lucide-react";
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
      <header className="app-header">
        <Link href="/patients" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Plus size={23} />
          </span>
          <span>
            Clinic<span className="brand-caption">{c.workspace}</span>
          </span>
        </Link>
        <nav aria-label={c.workspace}>
          <Link href="/patients" className="nav-link">
            <Users size={17} />
            {c.patients}
          </Link>
        </nav>
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
      </header>
      <main id="main" className="workspace">
        {children}
      </main>
    </div>
  );
}
