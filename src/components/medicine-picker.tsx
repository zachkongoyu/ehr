"use client";
import { useState } from "react";
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
  const en = locale === "en";
  const matches = medicines.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const chosen = medicines.find((item) => item.id === value);
  const options =
    chosen && !matches.some((item) => item.id === chosen.id)
      ? [chosen, ...matches]
      : matches;
  return (
    <div className="medicine-picker">
      <input
        type="search"
        aria-label={
          en
            ? "Search medicines by product name or strength"
            : "搜尋藥物名稱或劑量"
        }
        placeholder={en ? "Search name or strength…" : "搜尋名稱或劑量…"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-describedby={id + "-matches"}
      />
      <select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{en ? "Select medicine" : "選擇藥物"}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <small id={id + "-matches"} aria-live="polite">
        {matches.length} {en ? "matching products" : "項相符藥物"}
      </small>
    </div>
  );
}
