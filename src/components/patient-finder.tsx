"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Suggestion } from "@/app/api/patients/suggest/route";
import type { Locale } from "@/lib/locale-shared";

// One search box for finding a patient. Tapping it pops up patients with
// an open consultation and those seen most recently, so the common case
// needs no typing; a few letters of a name (Chinese or English) or a few
// digits of a chart or phone number narrow the list as you type. One tap
// opens the patient: their open consultation if there is one, otherwise
// their chart.
export function PatientFinder({ locale, variant = "bar" }: { locale: Locale; variant?: "bar" | "page" }) {
  const en = locale === "en";
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/patients/suggest?q=" + encodeURIComponent(text), { signal: controller.signal });
        if (response.ok) {
          setResults(await response.json());
          setActive(-1);
        }
      } catch {
        // A newer keystroke cancelled this request.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, text ? 120 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function go(item: Suggestion) {
    setOpen(false);
    input.current?.blur();
    router.push(item.openVisitId ? `/patients/${item.id}/visits/${item.openVisitId}` : `/patients/${item.id}`);
  }

  const sex = (value: string) => value === "female" ? (en ? "F" : "女") : value === "male" ? (en ? "M" : "男") : "—";
  const heading = text ? (en ? "Matching patients" : "相符病人") : (en ? "Open consultations and recent patients" : "未完成診症及最近病人");

  return (
    <div className={"patient-finder finder-" + variant} ref={box} data-open={open || undefined}>
      <div className="finder-field">
        <Search size={18} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={id + "-list"}
          aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="go"
          placeholder={variant === "page"
            ? (en ? "Find patient: name, chart or phone" : "尋找病人：姓名、病歷編號或電話")
            : (en ? "Find patient" : "尋找病人")}
          aria-label={en ? "Find patient" : "尋找病人"}
          value={text}
          onFocus={() => setOpen(true)}
          onPointerDown={() => setOpen(true)}
          onChange={(event) => { setText(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (!results?.length) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, results.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
            if (event.key === "Enter") { event.preventDefault(); go(results[Math.max(active, 0)]); }
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {text && (
          <button type="button" className="finder-clear" aria-label={en ? "Clear search" : "清除搜尋"}
            onClick={() => { setText(""); input.current?.focus(); }}>
            <X size={18} />
          </button>
        )}
      </div>
      {open && (
        <div className="finder-popup">
          <p className="finder-heading" aria-live="polite">
            {heading}
            {loading && <span className="finder-loading" aria-hidden="true" />}
          </p>
          <ul id={id + "-list"} role="listbox" aria-label={heading}>
            {results?.map((item, index) => (
              <li key={item.id} id={`${id}-option-${index}`} role="option" aria-selected={index === active}>
                <button type="button" tabIndex={-1} onClick={() => go(item)} onPointerEnter={() => setActive(index)}>
                  <span className="finder-who">
                    <strong>{item.name}</strong>
                    <small>{item.otherName}</small>
                  </span>
                  <span className="finder-meta">
                    <data>{item.chartNumber}</data>
                    <span>{item.age !== null ? (en ? item.age + " y" : item.age + " 歲") : "—"} · {sex(item.sex)}</span>
                  </span>
                  <span className={"finder-action" + (item.openVisitId ? " resume" : "")}>
                    {item.openVisitId ? (en ? "Resume visit" : "繼續診症") : (en ? "Open chart" : "開啟病歷")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {results && !results.length && !loading && (
            <p className="finder-empty">{en ? "No patient matches. Check the spelling or try the chart number." : "沒有相符病人。請檢查拼寫或改用病歷編號。"}</p>
          )}
        </div>
      )}
    </div>
  );
}
