/** iOS-style segmented control (radio group of buttons). */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label = (o) => o,
  danger,
  allowClear = false,
  size,
}: {
  options: readonly T[];
  value: T | '' | undefined;
  onChange: (value: T | '') => void;
  label?: (option: T) => string;
  /** Option shown in red (e.g. "Inactive") */
  danger?: T;
  /** Tapping the selected option clears it */
  allowClear?: boolean;
  size?: 'small';
}) {
  return (
    <div
      className={size === 'small' ? 'segmented small' : 'segmented'}
      role="radiogroup"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => {
        const on = value === o;
        const cls = [on && 'on', o === danger && 'danger-opt'].filter(Boolean).join(' ');
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            className={cls || undefined}
            onClick={() => onChange(on && allowClear ? '' : o)}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}
