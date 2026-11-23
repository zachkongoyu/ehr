"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

export function MedicinePicker({
  id,
  value,
  medicines,
  locale,
  onChange,
}: {
  id: string;
  value: string;
  medicines: { id: string; name: string }[];
  locale: Locale;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(!value);
  const en = locale === "en";
  const choose = en ? "Choose medicine" : "選擇藥物";
  const chosen = medicines.find((item) => item.id === value);
  const matches = medicines.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <div className="medicine-picker">
      <button id={id} type="button" className="medicine-trigger"
        aria-expanded={open} aria-controls={open ? id + "-choices" : undefined}
        aria-label={chosen ? choose + " · " + chosen.name : choose}
        onClick={() => setOpen(!open)}>
        {chosen?.name ?? choose}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id={id + "-choices"} className="medicine-choices">
          <input
            type="search"
            aria-label={en ? "Search clinic catalogue" : "搜尋診所藥物目錄"}
            placeholder={en ? "Search name or strength" : "搜尋名稱或劑量"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          {matches.length ? (
            <ul aria-label={en ? "Clinic catalogue" : "診所藥物目錄"}>
              {matches.map((item) => (
                <li key={item.id}>
                  <button type="button" aria-pressed={item.id === value}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                      document.getElementById(id)?.focus();
                    }}>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p role="status">{en ? "No matching products" : "沒有相符藥物"}</p>}
        </div>
      )}
    </div>
  );
}
