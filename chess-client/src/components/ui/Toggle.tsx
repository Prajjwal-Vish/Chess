interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-[18px] rounded-pill shrink-0 transition-colors duration-200 cursor-pointer border-none outline-none p-0 ${
        checked ? 'bg-brand-blue/50' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 ${
          checked ? 'right-0.5 left-auto' : 'left-0.5'
        }`}
      />
    </button>
  );
}
