export default function GlobalSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="gs-shell" role="status" aria-label={label}>
      <div className="gs-ring" />
      <span className="gs-label">{label}</span>
    </div>
  );
}
