"use client";
import { useRef, useState } from "react";
import { Delete, Grid3X3 } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

export function TouchNumber({
  id, label, value, locale, units = [], min, max, onChange,
}: {
  id: string;
  label: string;
  value: string;
  locale: Locale;
  units?: string[];
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const en = locale === "en";
  const number = Number(amount);
  const valid = /\d/.test(amount) && Number.isFinite(number)
    && number >= (min ?? Number.MIN_VALUE)
    && number <= (max ?? Number.MAX_VALUE)
    && (!units.length || Boolean(unit));

  function open() {
    const parts = /^(\d*\.?\d+)\s*(.*)$/.exec(value);
    setAmount(parts && (!parts[2] || units.includes(parts[2])) ? parts[1] : "");
    setUnit(parts && units.includes(parts[2]) ? parts[2] : "");
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className="touch-keypad-trigger" onClick={open}
        aria-label={en ? "Keypad for " + label : label + "數字鍵盤"}>
        <Grid3X3 size={16} aria-hidden="true" />
      </button>
      <dialog ref={dialog} aria-labelledby={id + "-keypad-title"} className="touch-keypad">
        <h2 id={id + "-keypad-title"}>{label}</h2>
        <output aria-live="polite">{amount || "—"}{unit ? " " + unit : ""}</output>
        <div className="touch-digits">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((digit) => (
            <button type="button" key={digit} disabled={amount.length >= 10 || (digit === "." && amount.includes("."))}
              onClick={() => setAmount(amount + digit)}>{digit}</button>
          ))}
          <button type="button" aria-label={en ? "Delete last digit" : "刪除最後一位"}
            onClick={() => setAmount(amount.slice(0, -1))}><Delete size={19} /></button>
        </div>
        {units.length > 0 && <div className="touch-units" role="group" aria-label={en ? "Dose unit" : "劑量單位"}>
          {units.map((item) => <button type="button" key={item} aria-pressed={unit === item}
            onClick={() => setUnit(item)}>{item}</button>)}
        </div>}
        <div className="touch-keypad-actions">
          <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>
            {en ? "Cancel" : "取消"}
          </button>
          <button type="button" className="button primary" disabled={!valid} onClick={() => {
            onChange(String(number) + (unit ? " " + unit : ""));
            dialog.current?.close();
          }}>{en ? "Use value" : "使用此數值"}</button>
        </div>
      </dialog>
    </>
  );
}
