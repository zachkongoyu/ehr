export type Locale = "zh-HK" | "en";

export function intlLocale(locale: Locale) {
  return locale === "en" ? "en-HK" : "zh-HK";
}
