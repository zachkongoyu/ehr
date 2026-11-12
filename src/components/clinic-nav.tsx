"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Pill, ClipboardList } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

export function ClinicNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const en = locale === "en";
  const links = [
    {
      href: "/dashboard",
      label: en ? "Clinic overview" : "診所總覽",
      icon: LayoutDashboard,
    },
    { href: "/patients", label: en ? "Patients" : "病人", icon: Users },
    {
      href: "/consultations",
      label: en ? "Consultations" : "診症",
      icon: ClipboardList,
    },
    { href: "/medications", label: en ? "Medicines" : "藥物目錄", icon: Pill },
  ];
  return (
    <nav aria-label={en ? "Clinic navigation" : "診所導覽"}>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          title={label}
          className={"nav-link" + (pathname.startsWith(href) ? " current" : "")}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
