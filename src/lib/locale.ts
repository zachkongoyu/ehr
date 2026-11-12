import { cookies } from "next/headers";
import { type Locale } from "@/lib/locale-shared";

export type { Locale } from "@/lib/locale-shared";
export { intlLocale } from "@/lib/locale-shared";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return value === "en" ? "en" : "zh-HK";
}
