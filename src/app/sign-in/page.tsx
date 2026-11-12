import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/sign-in/form";
import { auth } from "@/lib/auth";
import { t } from "@/lib/copy";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/patients");
  const locale = await getLocale();
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <SignInForm copy={t(locale)} />
    </main>
  );
}
