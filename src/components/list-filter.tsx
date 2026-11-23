"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

// Narrows the list on the page as you type, without a search button.
// Changes are written to ?q= a moment after the last keystroke, so the
// filtered list is a normal link that can be shared or reloaded.
export function ListFilter({ value, placeholder, label, clearLabel }: {
  value: string; placeholder: string; label: string; clearLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(value);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setText(value), [value]);

  function update(next: string, delay = 250) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = new URLSearchParams(params.toString());
      if (next.trim()) query.set("q", next.trim());
      else query.delete("q");
      const search = query.toString();
      startTransition(() => router.replace(pathname + (search ? "?" + search : ""), { scroll: false }));
    }, delay);
  }

  return (
    <div className="list-filter" data-busy={pending || undefined}>
      <Search size={18} aria-hidden="true" />
      <input type="search" value={text} placeholder={placeholder} aria-label={label}
        autoComplete="off" enterKeyHint="search"
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); update(text, 0); } }} />
      {text && (
        <button type="button" aria-label={clearLabel} onClick={() => update("", 0)}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}
