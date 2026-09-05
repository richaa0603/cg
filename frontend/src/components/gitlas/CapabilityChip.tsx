interface CapabilityChipProps {
  label: string;
  onClick?: (label: string) => void;
}

export function CapabilityChip({ label, onClick }: CapabilityChipProps) {
  if (onClick) {
    return (
      <button type="button" className="g-chip g-chip--button" onClick={() => onClick(label)}>
        {label}
      </button>
    );
  }
  return <span className="g-chip">{label}</span>;
}

interface CapabilityChipsProps {
  capabilities: string[];
  max?: number;
  onSelect?: (label: string) => void;
}

export function CapabilityChips({ capabilities, max, onSelect }: CapabilityChipsProps) {
  if (capabilities.length === 0) {
    return <span className="g-faint" style={{ fontSize: 12 }}>No capabilities extracted yet</span>;
  }

  const visible = max ? capabilities.slice(0, max) : capabilities;
  const overflow = capabilities.length - visible.length;

  return (
    <div className="g-row g-row--wrap" style={{ gap: 6 }}>
      {visible.map((c) => (
        <CapabilityChip key={c} label={c} onClick={onSelect} />
      ))}
      {overflow > 0 && <span className="g-chip g-chip--tech">+{overflow} more</span>}
    </div>
  );
}

interface TechChipsProps {
  stack: string[];
}

export function TechChips({ stack }: TechChipsProps) {
  return (
    <div className="g-row g-row--wrap" style={{ gap: 6 }}>
      {stack.map((t) => (
        <span key={t} className="g-chip g-chip--tech">
          {t}
        </span>
      ))}
    </div>
  );
}
