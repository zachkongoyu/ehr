type Props = {
  title: string;
  options: string[];
  value: string;
  separator?: string;
  exclusive?: boolean;
  prefix?: string;
  // Other spellings of an option that count as the same answer, such as the
  // English term for a Chinese chip. Unticking removes every spelling.
  aliases?: Record<string, readonly string[]>;
  onChange: (value: string) => void;
};

// Tap targets for structured answers. Each option is written into the note
// text as `prefix + option`, so answers stay readable in the saved record.
export function VisitChoices({ title, options, value, separator = "\n", exclusive = false, prefix = "", aliases = {}, onChange }: Props) {
  const entries = value.split(separator);
  return (
    <fieldset className="visit-choices" data-exclusive={exclusive || undefined}>
      <legend>{title}</legend>
      <div className="choice-chips">
        {options.map((option) => {
          const token = prefix + option;
          const tokens = [token, ...(aliases[option] ?? []).map((alias) => prefix + alias)];
          const checked = entries.some((entry) => tokens.includes(entry.trim()));
          const base = exclusive ? entries.filter((entry) => !options.some((item) =>
            [item, ...(aliases[item] ?? [])].some((spelling) => prefix + spelling === entry.trim()))).join(separator) : value;
          const next = checked
            ? entries.filter((entry) => !tokens.includes(entry.trim())).join(separator)
            : base + (base && !base.endsWith(separator) ? separator : "") + token;
          return (
            <label key={option} className="choice-chip">
              <input type="checkbox" checked={checked} disabled={!checked && next.length > 20000}
                onChange={() => onChange(next)} />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
