export function IntelligenceOrb({
  size = "md",
  label,
  className = "",
  paused = false,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  paused?: boolean;
}) {
  return (
    <div
      className={["ai-orb-wrap", `ai-orb-wrap--${size}`, paused ? "is-paused" : "", className]
        .filter(Boolean)
        .join(" ")}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="ai-orb" aria-hidden="true">
        <span className="ai-orb-sheen" />
        <span className="ai-orb-ring" />
        <span className="ai-orb-core" />
      </span>
      {label ? <span className="ai-orb-label">{label}</span> : null}
    </div>
  );
}