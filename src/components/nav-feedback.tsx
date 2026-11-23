"use client";
import { useEffect, useState } from "react";

// Makes taps feel immediate on touch screens.
// 1. iOS Safari only applies :active styles once the page has a touch
//    listener, so a passive no-op listener turns pressed states on.
// 2. Page changes and form submissions wait on the server. The tapped link
//    or button is marked pending and a thin bar runs along the top until
//    the server's response renders. `renderedAt` changes on every server
//    render, which is what clears the pending state, so it also covers
//    actions that refresh the same page.
export function NavFeedback({ renderedAt }: { renderedAt: number }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  useEffect(() => {
    setPending(false);
    document.querySelectorAll("[data-pending]").forEach((element) => element.removeAttribute("data-pending"));
  }, [renderedAt]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = (element: Element | null) => {
      element?.setAttribute("data-pending", "");
      setPending(true);
      clearTimeout(timeout);
      // Never leave the indicator running if a response is lost.
      timeout = setTimeout(() => {
        setPending(false);
        document.querySelectorAll("[data-pending]").forEach((item) => item.removeAttribute("data-pending"));
      }, 15000);
    };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start(anchor);
    };
    const submit = (event: SubmitEvent) => {
      // Forms that handle their own submit in the browser (the consultation
      // note) show their own saving state.
      if (event.target instanceof HTMLFormElement && event.target.id === "consultation-form") return;
      start(event.submitter ?? (event.target as Element));
    };
    // Listen on window in the bubble phase. Next.js links and form actions
    // always call preventDefault (they navigate in the browser), so that
    // flag says nothing here; a cancelled "leave without saving?" prompt
    // stops propagation instead, so the event never reaches window.
    window.addEventListener("click", click);
    window.addEventListener("submit", submit);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("click", click);
      window.removeEventListener("submit", submit);
    };
  }, []);

  return <div className="nav-progress" data-active={pending || undefined} aria-hidden="true" />;
}
