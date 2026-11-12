"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/motion/button";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
} from "@/components/motion/animated-sidebar";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { setLocale } from "@/app/actions";
import type { Copy } from "@/lib/copy";
import type { Locale } from "@/lib/locale-shared";
import type { PatientLink } from "@/lib/chart";

export function ClinicShell({
  locale,
  copy,
  patients,
  activeId,
  chip,
  children,
}: {
  locale: Locale;
  copy: Copy;
  patients: PatientLink[];
  activeId?: string;
  chip?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AnimatedSidebarProvider
      labels={{ label: copy.patients, toggle: copy.toggle, close: copy.close }}
    >
      <AnimatedSidebar ariaLabel={copy.patients}>
        <AnimatedSidebarHeader>
          <AnimatedBadge status="neutral">{copy.patients}</AnimatedBadge>
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>{copy.patients}</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {patients.map((patient) => (
                  <AnimatedSidebarMenuItem key={patient.id}>
                    <AnimatedSidebarMenuButton
                      href={`/patients/${patient.id}`}
                      isActive={patient.id === activeId}
                    >
                      {patient.name}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarFooter>
          <form action={setLocale.bind(null, "zh-HK")}>
            <Button type="submit" size="sm" variant={locale === "zh-HK" ? "primary" : "outline"}>
              繁體中文
            </Button>
          </form>
          <form action={setLocale.bind(null, "en")}>
            <Button type="submit" size="sm" variant={locale === "en" ? "primary" : "outline"}>
              English
            </Button>
          </form>
        </AnimatedSidebarFooter>
      </AnimatedSidebar>
      <AnimatedSidebarInset>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <AnimatedSidebarTrigger />
            {chip}
          </div>
          {children}
        </div>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
