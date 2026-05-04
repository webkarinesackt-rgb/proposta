import { cn } from "@/lib/utils";

interface RadialGlowBackgroundProps {
  className?: string;
  /** cx cy position, e.g. "50% 0px" */
  position?: string;
  /** radius in px */
  radius?: number;
  /** teal glow (default) or neon */
  variant?: 'teal' | 'neon' | 'mixed';
  children?: React.ReactNode;
}

export function RadialGlowBackground({
  className,
  position = "50% 0px",
  radius = 600,
  variant = 'teal',
  children,
}: RadialGlowBackgroundProps) {
  const colors = {
    teal:  `rgba(139,183,175,0.28)`,
    neon:  `rgba(244,249,157,0.18)`,
    mixed: `rgba(139,183,175,0.22)`,
  }

  const gradient =
    variant === 'mixed'
      ? `radial-gradient(circle ${radius}px at ${position}, ${colors.teal}, transparent 70%), radial-gradient(circle ${Math.round(radius * 0.6)}px at 80% 60%, ${colors.neon}, transparent 60%)`
      : `radial-gradient(circle ${radius}px at ${position}, ${colors[variant]}, transparent)`

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: gradient }}
      />
      <div className="relative z-1">{children}</div>
    </div>
  );
}
