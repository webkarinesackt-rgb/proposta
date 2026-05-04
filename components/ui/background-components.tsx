"use client";

export const GradientGlowYellow = () => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(circle at center, #FFF991 0%, transparent 70%)`,
        opacity: 0.6,
        mixBlendMode: "multiply",
      }}
    />
  </div>
);

export const GradientGlowTeal = () => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#ffffff",
        backgroundImage: `radial-gradient(circle at top right, rgba(56,193,182,0.5), transparent 70%)`,
        filter: "blur(80px)",
        backgroundRepeat: "no-repeat",
      }}
    />
  </div>
);
