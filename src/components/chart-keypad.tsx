"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Delete } from "lucide-react";

// Find a patient by tapping the digits of their chart number, without the
// on-screen keyboard. The digits show at once; the list follows a moment
// later as the page reloads with the new filter.
export function ChartKeypad({ value, label, clearLabel }: { value: string; label: string; clearLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [digits, setDigits] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => setDigits(value), [value]);

  function update(next: string) {
    setDigits(next);
    const query = new URLSearchParams(params.toString());
    if (next) query.set("no", next);
    else query.delete("no");
    startTransition(() => router.replace(pathname + "?" + query.toString(), { scroll: false }));
  }

  return (
    <div className="chart-keypad" data-pending={pending || undefined}>
      <output aria-live="polite" aria-label={label}>
        {digits ? <data>{digits}</data> : <span>{label}</span>}
      </output>
      <div className="chart-keypad-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button type="button" key={digit} disabled={digits.length >= 8} onClick={() => update(digits + digit)}>
            {digit}
          </button>
        ))}
        <button type="button" className="key-clear" disabled={!digits} onClick={() => update("")}>{clearLabel}</button>
        <button type="button" disabled={digits.length >= 8} onClick={() => update(digits + "0")}>0</button>
        <button type="button" disabled={!digits} aria-label="Delete last digit" onClick={() => update(digits.slice(0, -1))}>
          <Delete size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
