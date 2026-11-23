type Props = {
  title: string;
  options: string[];
  value: string;
  separator?: string;
  exclusive?: boolean;
  prefix?: string;
  onChange: (value: string) => void;
};

export function VisitChoices({ title, options, value, separator = "\n", exclusive = false, prefix = "", onChange }: Props) {
  const entries = value.split(separator);
  return (
    <fieldset className="visit-choices">
      <legend>{title}</legend>
      <div>
        {options.map((option) => {
          const token = prefix + option;
          const checked = entries.some((entry) => entry.trim() === token);
          const base = exclusive ? entries.filter((entry) => !options.some((item) => prefix + item === entry.trim())).join(separator) : value;
          const next = checked
            ? entries.filter((entry) => entry.trim() !== token).join(separator)
            : base + (base && !base.endsWith(separator) ? separator : "") + token;
          return (
            <label key={option}>
              <input type="checkbox" checked={checked} disabled={!checked && next.length > 20000}
                onChange={() => onChange(next)} />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
